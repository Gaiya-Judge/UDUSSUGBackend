/**
 * UDUS SUG Blockchain Voting System - Admin Dashboard Controller
 * 
 * Manages:
 * - Fetching GET /api/admin/dashboard, GET /api/admin/positions, GET /api/admin/candidates
 * - Computing server clock offset and ticking the countdown timer every second
 * - Displaying Election Status with distinct badges (NO green per institutional specification)
 * - Displaying Total Votes Cast, turnout %, and thin progress bar (with null safety & div-by-zero guard)
 * - Rendering Positions & Candidates table with candidate count per position
 * - Detecting session disparity between working session and dashboard current session
 * - Auto-refreshing all data every 30 seconds
 * - Inline error banner with Retry capability
 */

import { apiFetch } from "./admin-common.js";

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
let dashboardData = null;
let positionsData = [];
let candidatesData = [];
let serverClockOffsetMs = 0; // serverTime - browserTime
let countdownIntervalId = null;
let autoRefreshIntervalId = null;
let isLoading = false;

// -------------------------------------------------------------
// DOM Element Selectors
// -------------------------------------------------------------
const dom = {
    // Error Banner
    errorBanner: document.getElementById("adminErrorBanner"),
    errorMessage: document.getElementById("adminErrorMessage"),
    retryBtn: document.getElementById("adminRetryBtn"),

    // Dashboard Header
    sessionBadge: document.getElementById("dashboardSessionBadge"),

    // Card 1: Status
    statusBadge: document.getElementById("electionStatusBadge"),
    statusText: document.getElementById("electionStatusText"),
    statusDesc: document.getElementById("electionStatusDesc"),

    // Card 2: Countdown
    countdownDisplay: document.getElementById("countdownDisplay"),
    countdownSubtext: document.getElementById("countdownSubtext"),

    // Card 3: Votes & Turnout
    totalVotesDisplay: document.getElementById("totalVotesDisplay"),
    eligibleVotersCount: document.getElementById("eligibleVotersCount"),
    turnoutPercentage: document.getElementById("turnoutPercentage"),
    turnoutProgressBar: document.getElementById("turnoutProgressBar"),

    // Table: Positions & Candidates
    workingSessionLabel: document.getElementById("workingSessionLabel"),
    sessionDiffNote: document.getElementById("sessionDiffNote"),
    positionsTableBody: document.getElementById("positionsTableBody"),
    positionsEmptyState: document.getElementById("positionsEmptyState"),
    positionsTableContainer: document.getElementById("positionsTableContainer"),
};

// -------------------------------------------------------------
// Utility Functions
// -------------------------------------------------------------

/**
 * Format date-time for human-readable display in Nigerian Local Time (Africa/Lagos WAT).
 * Example: "Jan 25, 2026 at 12:00 PM"
 */
function formatLocalTime(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";

    const datePart = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);

    const timePart = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    }).format(date);

    return `${datePart} at ${timePart}`;
}

/**
 * Format duration milliseconds into "02d 14h 32m 17s".
 */
function formatDuration(diffMs) {
    if (diffMs <= 0) return "00d 00h 00m 00s";

    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const pad = (n) => String(n).padStart(2, "0");

    if (days > 0) {
        return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

// -------------------------------------------------------------
// Rendering Handlers
// -------------------------------------------------------------

/**
 * Render Status Card (Strictly NO GREEN anywhere).
 * Ongoing = purple, Upcoming = amber, Ended = grey, Not scheduled = grey outline.
 */
function renderElectionStatus(status) {
    const s = (status || "NOT_SCHEDULED").toUpperCase();

    // Reset badge classes
    dom.statusBadge.className = "badge-status";

    switch (s) {
        case "ONGOING":
            dom.statusBadge.classList.add("ongoing");
            dom.statusText.textContent = "Ongoing";
            dom.statusDesc.textContent = "The election is currently in progress.";
            break;

        case "UPCOMING":
            dom.statusBadge.classList.add("upcoming");
            dom.statusText.textContent = "Upcoming";
            dom.statusDesc.textContent = "The election is scheduled to start soon.";
            break;

        case "ENDED":
            dom.statusBadge.classList.add("ended");
            dom.statusText.textContent = "Ended";
            dom.statusDesc.textContent = "The election has officially concluded.";
            break;

        case "NOT_SCHEDULED":
        default:
            dom.statusBadge.classList.add("not-scheduled");
            dom.statusText.textContent = "Not Scheduled";
            dom.statusDesc.textContent = "No election schedule has been configured.";
            break;
    }
}

/**
 * Tick Countdown Timer every second.
 * Computes offset between serverTime and browser clock.
 */
function updateCountdownTick() {
    if (!dashboardData) {
        dom.countdownDisplay.textContent = "-";
        dom.countdownSubtext.textContent = "-";
        return;
    }

    const { status, startTime, endTime } = dashboardData;
    const currentServerTime = Date.now() + serverClockOffsetMs;
    const s = (status || "").toUpperCase();

    if (s === "UPCOMING" && startTime) {
        const startMs = Date.parse(startTime);
        if (!isNaN(startMs)) {
            const diffMs = startMs - currentServerTime;
            if (diffMs > 0) {
                dom.countdownDisplay.textContent = formatDuration(diffMs);
                dom.countdownSubtext.textContent = `Election starts on ${formatLocalTime(startTime)}`;
                return;
            } else {
                dom.countdownDisplay.textContent = "Starting soon";
                dom.countdownSubtext.textContent = `Scheduled for ${formatLocalTime(startTime)}`;
                return;
            }
        }
    } else if (s === "ONGOING" && endTime) {
        const endMs = Date.parse(endTime);
        if (!isNaN(endMs)) {
            const diffMs = endMs - currentServerTime;
            if (diffMs > 0) {
                dom.countdownDisplay.textContent = formatDuration(diffMs);
                dom.countdownSubtext.textContent = `Election ends on ${formatLocalTime(endTime)}`;
                return;
            } else {
                dom.countdownDisplay.textContent = "Closing...";
                dom.countdownSubtext.textContent = `Ended on ${formatLocalTime(endTime)}`;
                return;
            }
        }
    } else if (s === "ENDED") {
        dom.countdownDisplay.textContent = "-";
        dom.countdownSubtext.textContent = endTime ? `Election ended on ${formatLocalTime(endTime)}` : "Election has ended";
        return;
    }

    // Default / NOT_SCHEDULED
    dom.countdownDisplay.textContent = "-";
    dom.countdownSubtext.textContent = "No election in progress";
}

/**
 * Render Total Votes Cast card.
 * Total votes, "of Y eligible voters", turnout %, thin progress bar.
 * Null safety & never divide by zero.
 */
function renderVotesCast(totalVotesCast, totalEligibleVoters) {
    // 1. Total Votes Cast
    if (totalVotesCast !== null && totalVotesCast !== undefined) {
        dom.totalVotesDisplay.textContent = Number(totalVotesCast).toLocaleString();
    } else {
        dom.totalVotesDisplay.textContent = "-";
    }

    // 2. Eligible Voters Count
    const eligibleNum = Number(totalEligibleVoters);
    if (!isNaN(eligibleNum) && eligibleNum > 0) {
        dom.eligibleVotersCount.textContent = eligibleNum.toLocaleString();
    } else {
        dom.eligibleVotersCount.textContent = "-";
    }

    // 3. Turnout percentage & progress bar
    if (totalVotesCast !== null && totalVotesCast !== undefined && !isNaN(eligibleNum) && eligibleNum > 0) {
        const votesNum = Number(totalVotesCast);
        const pct = Math.min(100, Math.max(0, (votesNum / eligibleNum) * 100));
        dom.turnoutPercentage.textContent = `(${pct.toFixed(1)}%)`;
        dom.turnoutProgressBar.style.width = `${pct}%`;
    } else {
        dom.turnoutPercentage.textContent = "(-%)";
        dom.turnoutProgressBar.style.width = "0%";
    }
}

/**
 * Render Positions & Candidates Table.
 * One row per position with name and candidate count.
 * Working session label in header, plus "Prepared for the next session" note when differing.
 */
function renderPositionsTable(positions, candidates, dashboardSessionLabel) {
    if (!Array.isArray(positions) || positions.length === 0) {
        dom.positionsTableContainer.style.display = "none";
        dom.positionsEmptyState.style.display = "block";

        const workingSession = dashboardSessionLabel || "Current";
        dom.workingSessionLabel.textContent = workingSession;
        dom.sessionDiffNote.style.display = "none";
        return;
    }

    dom.positionsEmptyState.style.display = "none";
    dom.positionsTableContainer.style.display = "block";

    // Determine working session label
    const workingSession = positions[0]?.sessionLabel || candidates[0]?.sessionLabel || dashboardSessionLabel || "-";
    dom.workingSessionLabel.textContent = workingSession;

    // Check if working session differs from dashboard sessionLabel
    if (dashboardSessionLabel && workingSession && workingSession !== dashboardSessionLabel) {
        dom.sessionDiffNote.style.display = "inline-block";
        dom.sessionDiffNote.textContent = "Prepared for the next session";
    } else {
        dom.sessionDiffNote.style.display = "none";
    }

    // Map candidate count per positionId
    const candidateCounts = new Map();
    if (Array.isArray(candidates)) {
        candidates.forEach(cand => {
            if (cand && cand.positionId !== undefined && cand.positionId !== null) {
                const pId = Number(cand.positionId);
                candidateCounts.set(pId, (candidateCounts.get(pId) || 0) + 1);
            }
        });
    }

    // Render table rows
    dom.positionsTableBody.innerHTML = "";
    positions.forEach((pos, index) => {
        const posId = Number(pos.id);
        const count = candidateCounts.get(posId) || 0;
        const candidateLabel = count === 1 ? "1 Candidate" : `${count} Candidates`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="color: #64748B; font-weight: 500; width: 60px;">${index + 1}</td>
            <td style="font-weight: 600; color: #1E1533;">${escapeHtml(pos.name || "Untitled Position")}</td>
            <td>
                <span class="candidate-count-pill">${candidateLabel}</span>
            </td>
            <td style="color: #64748B;">${escapeHtml(pos.sessionLabel || workingSession)}</td>
        `;
        dom.positionsTableBody.appendChild(tr);
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

// -------------------------------------------------------------
// Data Loading & API Orchestration
// -------------------------------------------------------------

function showError(message) {
    if (dom.errorMessage) {
        dom.errorMessage.textContent = message || "An error occurred while loading dashboard data.";
    }
    if (dom.errorBanner) {
        dom.errorBanner.classList.add("show");
    }
}

function hideError() {
    if (dom.errorBanner) {
        dom.errorBanner.classList.remove("show");
    }
}

/**
 * Fetch all dashboard datasets concurrently:
 * - GET /api/admin/dashboard
 * - GET /api/admin/positions
 * - GET /api/admin/candidates
 */
export async function loadDashboardData() {
    if (isLoading) return;
    isLoading = true;

    try {
        const [dashRes, posRes, candRes] = await Promise.all([
            apiFetch("/api/admin/dashboard"),
            apiFetch("/api/admin/positions"),
            apiFetch("/api/admin/candidates")
        ]);

        // If dashboard response is ok
        if (!dashRes.ok) {
            throw new Error(
                (dashRes.data && dashRes.data.message)
                    ? dashRes.data.message
                    : `Dashboard error (HTTP ${dashRes.status})`
            );
        }

        hideError();

        // 1. Process Dashboard data
        dashboardData = dashRes.data;
        const browserTimestamp = Date.now();
        if (dashboardData.serverTime) {
            const parsedServerTime = Date.parse(dashboardData.serverTime);
            if (!isNaN(parsedServerTime)) {
                serverClockOffsetMs = parsedServerTime - browserTimestamp;
            }
        }

        // Header session badge
        dom.sessionBadge.textContent = dashboardData.sessionLabel || "Not Scheduled";

        // Card 1: Status
        renderElectionStatus(dashboardData.status);

        // Card 2: Countdown
        updateCountdownTick();

        // Card 3: Total Votes Cast
        renderVotesCast(dashboardData.totalVotesCast, dashboardData.totalEligibleVoters);

        // 2. Process Positions & Candidates
        positionsData = posRes.ok && Array.isArray(posRes.data) ? posRes.data : [];
        candidatesData = candRes.ok && Array.isArray(candRes.data) ? candRes.data : [];

        renderPositionsTable(positionsData, candidatesData, dashboardData.sessionLabel);

    } catch (err) {
        showError(err.message || "Failed to connect to election server. Please retry.");
    } finally {
        isLoading = false;
        if (dom.retryBtn) {
            dom.retryBtn.disabled = false;
            dom.retryBtn.textContent = "Retry";
        }
    }
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // Retry button click
    if (dom.retryBtn) {
        dom.retryBtn.addEventListener("click", () => {
            dom.retryBtn.disabled = true;
            dom.retryBtn.textContent = "Retrying...";
            loadDashboardData();
        });
    }

    // Initial data fetch
    loadDashboardData();

    // Start 1-second countdown interval
    if (countdownIntervalId) clearInterval(countdownIntervalId);
    countdownIntervalId = setInterval(updateCountdownTick, 1000);

    // Start 30-second auto-refresh interval
    if (autoRefreshIntervalId) clearInterval(autoRefreshIntervalId);
    autoRefreshIntervalId = setInterval(loadDashboardData, 30000);
});

// Cleanup timers when leaving page
window.addEventListener("beforeunload", () => {
    if (countdownIntervalId) clearInterval(countdownIntervalId);
    if (autoRefreshIntervalId) clearInterval(autoRefreshIntervalId);
});
