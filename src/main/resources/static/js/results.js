/**
 * UDUS SUG Blockchain Voting System - Public Results Page Controller
 *
 * Requirements:
 * - Public page: No admin token required, no auth guards, no redirects.
 * - Shows "Back to Dashboard" in header only if sessionStorage contains adminToken.
 * - Checks GET /api/election first:
 *     - NOT_SCHEDULED: centered card "No election has been scheduled yet."
 *     - UPCOMING / ONGOING: centered waiting card with end time & live countdown.
 *       Re-checks every 30s and when countdown hits zero. Shows zero vote counts.
 *     - ENDED: loads positions, turnout, and position results in parallel.
 * - In ENDED:
 *     - Retries every 10s if results NOT_AVAILABLE_YET or failed, showing "Finalizing results...".
 *     - After ~2 minutes of finalization, reveals a Retry button.
 *     - Once available, renders candidates sorted descending by voteCount, Abstained row,
 *       Winner badge, and summary line.
 *     - Percentages computed out of total ballots cast (voteCount / totalVotesCast * 100).
 */

import { apiRequest } from "./api.js";

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
let electionData = null;
let serverClockOffsetMs = 0; // serverTime - browserTime
let countdownIntervalId = null;
let electionPollIntervalId = null;
let finalizationRetryTimeoutId = null;
let finalizationStartTime = null;

let allPositions = [];
let totalVotesCast = 0;
let positionResultsMap = new Map(); // positionId -> ResultsResponse
let activePositionId = null;
let isFinalizing = false;

// -------------------------------------------------------------
// DOM Elements
// -------------------------------------------------------------
const dom = {
    shellBody: document.getElementById("shellBody"),
    positionsSidebar: document.getElementById("positionsSidebar"),
    positionsNavList: document.getElementById("positionsNavList"),
    mainContent: document.getElementById("mainContent"),
    backToAdminLink: document.getElementById("backToAdminLink")
};

// -------------------------------------------------------------
// Avatar Initials & Color Palette (Reused from ballot.js)
// -------------------------------------------------------------
const AVATAR_PALETTES = [
    { bg: "#EDE8F8", color: "#372859" },
    { bg: "#E0E7FF", color: "#3730A3" },
    { bg: "#E0F2FE", color: "#0369A1" },
    { bg: "#FCE7F3", color: "#9D174D" },
    { bg: "#FEF3C7", color: "#92400E" },
    { bg: "#DCFCE7", color: "#166534" }
];

function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarPalette(id) {
    const num = Math.abs(Number(id) || 0);
    return AVATAR_PALETTES[num % AVATAR_PALETTES.length];
}

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Format date-time in Nigerian Local Time (Africa/Lagos WAT).
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
 * Format duration milliseconds into "02d 14h 32m 17s" or "14h 32m 17s".
 */
function formatDuration(diffMs) {
    if (diffMs <= 0) return "00h 00m 00s";

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
// Header Admin Link Check
// -------------------------------------------------------------
function checkAdminTokenLink() {
    const adminToken = sessionStorage.getItem("adminToken");
    if (adminToken && adminToken.trim() !== "") {
        if (dom.backToAdminLink) {
            dom.backToAdminLink.style.display = "inline-flex";
        }
    }
}

// -------------------------------------------------------------
// Lifecycle: Check Election State
// -------------------------------------------------------------
async function checkElectionState() {
    try {
        const res = await apiRequest("/api/election");
        if (!res.ok || !res.data) {
            renderConnectionError("Unable to connect to election service. Please check your network.");
            return;
        }

        electionData = res.data;
        const status = (electionData.status || "NOT_SCHEDULED").toUpperCase();

        // Calculate server clock offset
        if (electionData.serverTime) {
            const parsedServerTime = Date.parse(electionData.serverTime);
            if (!isNaN(parsedServerTime)) {
                serverClockOffsetMs = parsedServerTime - Date.now();
            }
        }

        if (status === "NOT_SCHEDULED") {
            stopWaitingTimers();
            renderNotScheduledState();
        } else if (status === "UPCOMING" || status === "ONGOING") {
            renderWaitingState(status);
        } else if (status === "ENDED") {
            stopWaitingTimers();
            loadAllResultsData();
        } else {
            renderNotScheduledState();
        }
    } catch (err) {
        console.error("Error checking election state:", err);
        renderConnectionError("An unexpected error occurred while contacting the election server.");
    }
}

function stopWaitingTimers() {
    if (countdownIntervalId) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
    }
    if (electionPollIntervalId) {
        clearInterval(electionPollIntervalId);
        electionPollIntervalId = null;
    }
}

// -------------------------------------------------------------
// State: NOT_SCHEDULED
// -------------------------------------------------------------
function renderNotScheduledState() {
    if (dom.positionsSidebar) dom.positionsSidebar.style.display = "none";
    if (dom.shellBody) dom.shellBody.classList.add("centered-layout");

    dom.mainContent.innerHTML = `
        <div class="results-center-wrapper">
            <div class="waiting-card">
                <div class="waiting-icon-box" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <div class="badge-status not-scheduled">
                    <span class="status-dot" aria-hidden="true"></span>
                    <span>Not Scheduled</span>
                </div>
                <h1 class="waiting-title">No Election Scheduled</h1>
                <p class="waiting-subtitle">No election has been scheduled yet. Results will appear here once an election has been conducted and finalized.</p>
                <div class="waiting-notice-pill">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    <span>UDUS SUG Blockchain Network</span>
                </div>
            </div>
        </div>
    `;
}

// -------------------------------------------------------------
// State: UPCOMING or ONGOING (Waiting State)
// -------------------------------------------------------------
function renderWaitingState(status) {
    if (dom.positionsSidebar) dom.positionsSidebar.style.display = "none";
    if (dom.shellBody) dom.shellBody.classList.add("centered-layout");

    const isOngoing = status === "ONGOING";
    const targetTime = isOngoing ? electionData.endTime : electionData.startTime;
    const formattedTargetTime = formatLocalTime(targetTime);

    const badgeClass = isOngoing ? "ongoing" : "upcoming";
    const badgeText = isOngoing ? "Ongoing" : "Upcoming";
    const countdownLabel = isOngoing ? "Time remaining until voting ends" : "Time until voting begins";

    dom.mainContent.innerHTML = `
        <div class="results-center-wrapper">
            <div class="waiting-card">
                <div class="waiting-icon-box" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>

                <div class="badge-status ${badgeClass}">
                    <span class="status-dot" aria-hidden="true"></span>
                    <span>${badgeText}</span>
                </div>

                <h1 class="waiting-title">Results will be published automatically when voting ends</h1>
                <p class="waiting-subtitle">
                    ${isOngoing ? `Voting concludes on <strong>${formattedTargetTime}</strong>.` : `Voting commences on <strong>${formattedTargetTime}</strong>.`}
                    Ballot counts are sealed on the smart contract until voting concludes.
                </p>

                <div class="waiting-countdown-wrapper">
                    <span class="waiting-countdown-label">${countdownLabel}</span>
                    <span id="waitingCountdownDisplay" class="waiting-countdown-time">--:--:--</span>
                </div>

                <div class="waiting-notice-pill">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span>Official Smart Contract Vault Sealed</span>
                </div>
            </div>
        </div>
    `;

    // Start countdown ticker
    function tickWaitingCountdown() {
        if (!targetTime) return;
        const targetMs = Date.parse(targetTime);
        if (isNaN(targetMs)) return;

        const currentServerMs = Date.now() + serverClockOffsetMs;
        const diffMs = targetMs - currentServerMs;

        const countdownEl = document.getElementById("waitingCountdownDisplay");
        if (!countdownEl) return;

        if (diffMs <= 0) {
            countdownEl.textContent = "00h 00m 00s";
            stopWaitingTimers();
            // Re-check immediately when countdown reaches zero
            checkElectionState();
            return;
        }

        countdownEl.textContent = formatDuration(diffMs);
    }

    tickWaitingCountdown();
    if (!countdownIntervalId) {
        countdownIntervalId = setInterval(tickWaitingCountdown, 1000);
    }

    // Auto-poll GET /api/election every 30 seconds
    if (!electionPollIntervalId) {
        electionPollIntervalId = setInterval(checkElectionState, 30000);
    }
}

// -------------------------------------------------------------
// State: ENDED -> Parallel Data Loading
// -------------------------------------------------------------
async function loadAllResultsData() {
    if (finalizationRetryTimeoutId) {
        clearTimeout(finalizationRetryTimeoutId);
        finalizationRetryTimeoutId = null;
    }

    if (!finalizationStartTime) {
        finalizationStartTime = Date.now();
    }

    try {
        // Step 1: Fetch positions and turnout in parallel
        const [positionsRes, turnoutRes] = await Promise.all([
            apiRequest("/api/positions"),
            apiRequest("/api/turnout")
        ]);

        if (!positionsRes.ok || !turnoutRes.ok) {
            handleFinalizingState("Synchronizing positions and turnout data with blockchain nodes...");
            return;
        }

        allPositions = Array.isArray(positionsRes.data) ? positionsRes.data : [];
        totalVotesCast = Number(turnoutRes.data?.totalVotesCast) || 0;

        if (allPositions.length === 0) {
            renderEmptyPositionsState();
            return;
        }

        // Step 2: Fetch results for all positions in parallel
        const resultPromises = allPositions.map(pos => apiRequest(`/api/results/${pos.id}`));
        const resultsResponses = await Promise.all(resultPromises);

        // Check if any position result is not available yet or errored
        let hasPendingResults = false;
        positionResultsMap.clear();

        for (let i = 0; i < allPositions.length; i++) {
            const pos = allPositions[i];
            const res = resultsResponses[i];

            if (!res.ok || !res.data || res.data.status === "NOT_AVAILABLE_YET") {
                hasPendingResults = true;
                break;
            }

            positionResultsMap.set(pos.id, res.data);
        }

        if (hasPendingResults) {
            handleFinalizingState("Finalizing results on the blockchain...");
            return;
        }

        // All results successfully loaded!
        isFinalizing = false;
        finalizationStartTime = null;

        // Choose initial active position
        if (!activePositionId || !allPositions.some(p => p.id === activePositionId)) {
            activePositionId = allPositions[0].id;
        }

        renderResultsShell();
    } catch (err) {
        console.error("Error loading all results:", err);
        handleFinalizingState("Finalizing results on the blockchain...");
    }
}

/**
 * Handle blockchain finalization state with 10s auto-retry and 2m manual retry button.
 */
function handleFinalizingState(statusMessage) {
    isFinalizing = true;
    if (dom.positionsSidebar) dom.positionsSidebar.style.display = "none";
    if (dom.shellBody) dom.shellBody.classList.add("centered-layout");

    const elapsedMs = Date.now() - (finalizationStartTime || Date.now());
    const showRetryButton = elapsedMs >= 120000; // ~2 minutes

    dom.mainContent.innerHTML = `
        <div class="results-center-wrapper">
            <div class="finalizing-card">
                <div class="finalizing-spinner" aria-hidden="true"></div>
                <div class="badge-status ongoing">
                    <span class="status-dot" aria-hidden="true"></span>
                    <span>Results pending</span>
                </div>
                <h1 class="finalizing-title">${escapeHtml(statusMessage)}</h1>
                <p class="finalizing-desc">
                    The election has closed and results are being compiled and cryptographically verified on the blockchain. 
                    This page checks the ledger every 10 seconds and will update automatically.
                </p>
                ${showRetryButton ? `
                    <button type="button" class="btn-results-retry" id="manualRetryBtn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        <span>Retry Now</span>
                    </button>
                ` : ""}
            </div>
        </div>
    `;

    const retryBtn = document.getElementById("manualRetryBtn");
    if (retryBtn) {
        retryBtn.addEventListener("click", () => {
            loadAllResultsData();
        });
    }

    // Schedule next auto-retry in 10 seconds
    finalizationRetryTimeoutId = setTimeout(loadAllResultsData, 10000);
}

// -------------------------------------------------------------
// Render Results Shell (Sidebar + Results Card)
// -------------------------------------------------------------
function renderResultsShell() {
    // Reveal sidebar and reset centered layout
    if (dom.positionsSidebar) dom.positionsSidebar.style.display = "flex";
    if (dom.shellBody) dom.shellBody.classList.remove("centered-layout");

    renderSidebarPositions();
    renderActivePositionResults();
}

/**
 * Render left sidebar positions list using dashboard classes.
 */
function renderSidebarPositions() {
    dom.positionsNavList.innerHTML = "";

    allPositions.forEach(pos => {
        const li = document.createElement("li");
        const isActive = pos.id === activePositionId;

        const button = document.createElement("button");
        button.type = "button";
        button.className = `admin-nav-item ${isActive ? "active" : ""}`;
        button.setAttribute("role", "tab");
        button.setAttribute("aria-selected", isActive ? "true" : "false");
        button.setAttribute("data-position-id", String(pos.id));

        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>${escapeHtml(pos.name)}</span>
        `;

        button.addEventListener("click", () => {
            if (activePositionId !== pos.id) {
                activePositionId = pos.id;
                renderSidebarPositions();
                renderActivePositionResults();
            }
        });

        li.appendChild(button);
        dom.positionsNavList.appendChild(li);
    });
}

/**
 * Render active position results panel.
 */
function renderActivePositionResults() {
    const currentPosition = allPositions.find(p => p.id === activePositionId);
    if (!currentPosition) return;

    const resultData = positionResultsMap.get(activePositionId);
    const rawCandidates = Array.isArray(resultData?.candidates) ? resultData.candidates : [];

    // Sort candidates descending by voteCount
    const sortedCandidates = [...rawCandidates].sort((a, b) => {
        return (Number(b.voteCount) || 0) - (Number(a.voteCount) || 0);
    });

    // Compute sum of candidate votes
    const votesForCandidates = sortedCandidates.reduce((sum, c) => {
        return sum + (Number(c.voteCount) || 0);
    }, 0);

    // Compute abstentions: max(0, totalVotesCast - sum of that position's candidate voteCounts)
    const abstainedCount = Math.max(0, totalVotesCast - votesForCandidates);

    // Determine highest vote count for Winner pill
    const topVoteCount = sortedCandidates.length > 0 ? (Number(sortedCandidates[0].voteCount) || 0) : 0;
    const secondVoteCount = sortedCandidates.length > 1 ? (Number(sortedCandidates[1].voteCount) || 0) : -1;
    // Show winner if top candidate has > 0 votes and strictly more votes than runner up
    const hasClearWinner = topVoteCount > 0 && topVoteCount > secondVoteCount;
    const winnerCandidateId = hasClearWinner ? sortedCandidates[0].candidateId : null;

    // Session label
    const sessionLabel = electionData?.sessionLabel || currentPosition.sessionLabel || "Session";

    // Candidate rows HTML
    const candidateRowsHtml = sortedCandidates.map(cand => {
        const count = Number(cand.voteCount) || 0;
        // Percentage calculated out of total ballots cast (voteCount / totalVotesCast * 100)
        const pctNumber = totalVotesCast > 0 ? (count / totalVotesCast) * 100 : 0;
        const pctFormatted = pctNumber.toFixed(1) + "%";

        const isWinner = cand.candidateId === winnerCandidateId;
        const palette = getAvatarPalette(cand.candidateId);
        const initials = getInitials(cand.name);

        return `
            <div class="results-candidate-row" data-candidate-id="${cand.candidateId}">
                <!-- Avatar -->
                <div class="results-avatar-wrap" style="background-color: ${palette.bg}; color: ${palette.color};" aria-hidden="true">
                    <span>${escapeHtml(initials)}</span>
                </div>

                <!-- Info & Progress -->
                <div class="results-candidate-content">
                    <div class="results-candidate-header">
                        <div class="results-candidate-info">
                            <div class="results-name-line">
                                <h3 class="results-candidate-name">${escapeHtml(cand.name)}</h3>
                                ${isWinner ? `<span class="badge-winner">Winner</span>` : ""}
                            </div>
                            ${cand.department ? `<p class="results-candidate-dept">${escapeHtml(cand.department)}</p>` : ""}
                        </div>

                        <div class="results-metrics-group">
                            <span class="results-vote-count">${count.toLocaleString()} ${count === 1 ? "vote" : "votes"}</span>
                            <span class="results-percentage">${pctFormatted}</span>
                        </div>
                    </div>

                    <div class="results-progress-track" role="progressbar" aria-valuenow="${pctNumber.toFixed(1)}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(cand.name)} vote share">
                        <div class="results-progress-fill" style="width: ${pctNumber}%;"></div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    // Abstained row HTML
    const abstainedPctNumber = totalVotesCast > 0 ? (abstainedCount / totalVotesCast) * 100 : 0;
    const abstainedPctFormatted = abstainedPctNumber.toFixed(1) + "%";

    const abstainedRowHtml = `
        <div class="results-candidate-row abstained-row">
            <!-- Abstained Avatar with No-entry SVG -->
            <div class="results-avatar-wrap results-avatar-abstain" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
            </div>

            <div class="results-candidate-content">
                <div class="results-candidate-header">
                    <div class="results-candidate-info">
                        <div class="results-name-line">
                            <h3 class="results-candidate-name">Abstained</h3>
                        </div>
                    </div>

                    <div class="results-metrics-group">
                        <span class="results-vote-count">${abstainedCount.toLocaleString()} ${abstainedCount === 1 ? "vote" : "votes"}</span>
                        <span class="results-percentage">${abstainedPctFormatted}</span>
                    </div>
                </div>

                <div class="results-progress-track" role="progressbar" aria-valuenow="${abstainedPctNumber.toFixed(1)}" aria-valuemin="0" aria-valuemax="100" aria-label="Abstained vote share">
                    <div class="results-progress-fill abstained" style="width: ${abstainedPctNumber}%;"></div>
                </div>
            </div>
        </div>
    `;

    dom.mainContent.innerHTML = `
        <header class="results-page-header">
            <div class="results-header-left">
                <div class="results-title-row">
                    <h1 class="results-main-title">Official Results</h1>
                    <span class="session-badge">${escapeHtml(sessionLabel)}</span>
                </div>
                <p class="results-subtext">Results are read directly from the election smart contract.</p>
            </div>

            <div class="results-header-right">
                <div class="badge-status ended">
                    <span class="status-dot" aria-hidden="true"></span>
                    <span>Election Ended</span>
                </div>
            </div>
        </header>

        <section class="results-card" aria-label="Results for ${escapeHtml(currentPosition.name)}">
            <div class="results-candidates-list">
                ${candidateRowsHtml}
                ${abstainedRowHtml}
            </div>

            <footer class="results-summary-line">
                <span>Total ballots cast: <strong class="results-summary-value">${totalVotesCast.toLocaleString()}</strong></span>
                <span class="results-summary-divider">|</span>
                <span>Votes for candidates: <strong class="results-summary-value">${votesForCandidates.toLocaleString()}</strong></span>
                <span class="results-summary-divider">|</span>
                <span>Abstained: <strong class="results-summary-value">${abstainedCount.toLocaleString()}</strong></span>
            </footer>
        </section>
    `;
}

// -------------------------------------------------------------
// Empty / Error State Handlers
// -------------------------------------------------------------
function renderEmptyPositionsState() {
    if (dom.positionsSidebar) dom.positionsSidebar.style.display = "none";
    if (dom.shellBody) dom.shellBody.classList.add("centered-layout");

    dom.mainContent.innerHTML = `
        <div class="results-center-wrapper">
            <div class="results-empty-card">
                <p class="mb-0">No election positions found for this session.</p>
            </div>
        </div>
    `;
}

function renderConnectionError(message) {
    if (dom.positionsSidebar) dom.positionsSidebar.style.display = "none";
    if (dom.shellBody) dom.shellBody.classList.add("centered-layout");

    dom.mainContent.innerHTML = `
        <div class="results-center-wrapper">
            <div class="waiting-card">
                <div class="waiting-icon-box" style="color: #991B1B; background-color: #FEF2F2; border-color: #FCA5A5;" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h1 class="waiting-title">Connection Error</h1>
                <p class="waiting-subtitle">${escapeHtml(message)}</p>
                <button type="button" class="btn-results-retry" id="errorRetryBtn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    <span>Retry</span>
                </button>
            </div>
        </div>
    `;

    const btn = document.getElementById("errorRetryBtn");
    if (btn) {
        btn.addEventListener("click", checkElectionState);
    }
}

// -------------------------------------------------------------
// Initialization & Cleanup
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    checkAdminTokenLink();
    checkElectionState();
});

window.addEventListener("beforeunload", () => {
    stopWaitingTimers();
    if (finalizationRetryTimeoutId) {
        clearTimeout(finalizationRetryTimeoutId);
    }
});
