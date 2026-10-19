/**
 * UDUS SUG Blockchain Voting System - Admin Election Settings Controller
 * 
 * Manages:
 * - Status banner from GET /api/election
 * - Session label card (prefill, validation, UPCOMING read-only lock)
 * - Schedule card (start & end datetime-local, start < end, immediate voting warning, POST /api/admin/election/schedule)
 * - Positions card (working session roster, Add Position form, POST /api/admin/positions)
 * - Close Election (modal confirmation, shown ONLY when status is ENDED and closed is false, POST /api/admin/election/close)
 * - Dynamic lock rules (ONGOING, ENDED with closed false, ENDED with closed true, UPCOMING/NOT_SCHEDULED)
 * - Blockchain submit loading state ("Submitting to blockchain...") and double-submit prevention
 * - Safe text rendering with textContent (zero innerHTML for dynamic text)
 * - Toast notifications for successful transactions
 */

import { apiFetch } from "./admin-common.js";

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
let electionData = null;
let positionsData = [];
let isSubmitting = false;

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message) {
    let container = document.getElementById("adminToastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "adminToastContainer";
        container.className = "admin-toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "admin-toast";

    const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    iconSvg.setAttribute("viewBox", "0 0 24 24");
    iconSvg.setAttribute("fill", "none");
    iconSvg.setAttribute("stroke", "currentColor");
    iconSvg.setAttribute("stroke-width", "2.5");
    iconSvg.setAttribute("stroke-linecap", "round");
    iconSvg.setAttribute("stroke-linejoin", "round");
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", "20 6 9 17 4 12");
    iconSvg.appendChild(polyline);

    const span = document.createElement("span");
    span.textContent = message;

    toast.appendChild(iconSvg);
    toast.appendChild(span);
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        toast.style.opacity = "0";
        toast.style.transform = "translateX(30px)";
        setTimeout(() => toast.remove(), 350);
    }, 4000);
}

// -------------------------------------------------------------
// Utility Functions
// -------------------------------------------------------------

/**
 * Format date-time for human-readable display in Nigerian Local Time (WAT).
 */
function formatLocalTime(isoString) {
    if (!isoString) return "—";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "—";

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
 * Validates session label: YYYY/YYYY format where second year = first year + 1.
 */
function validateSessionLabel(label) {
    if (!label || typeof label !== "string") return false;
    const trimmed = label.trim();
    if (!/^\d{4}\/\d{4}$/.test(trimmed)) return false;
    const [y1, y2] = trimmed.split("/").map(Number);
    return y2 === y1 + 1;
}

/**
 * Computes next session label (both years + 1).
 */
function getNextSessionLabel(label) {
    if (!label || !/^\d{4}\/\d{4}$/.test(label.trim())) return "";
    const [y1, y2] = label.trim().split("/").map(Number);
    return `${y1 + 1}/${y2 + 1}`;
}

/**
 * Converts ISO string or Date to format required by datetime-local input: "YYYY-MM-DDTHH:mm"
 */
function toDateTimeLocalInputVal(dateInput) {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";

    const pad = (n) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// -------------------------------------------------------------
// Status Banner & Lock Rules
// -------------------------------------------------------------
function renderStatusBanner(election) {
    const badgeEl = document.getElementById("statusBannerBadge");
    const badgeTextEl = document.getElementById("statusBannerBadgeText");
    const sessionValEl = document.getElementById("statusBannerSession");
    const startValEl = document.getElementById("statusBannerStart");
    const endValEl = document.getElementById("statusBannerEnd");
    const closedBadgeEl = document.getElementById("statusBannerClosed");

    const status = (election?.status || "NOT_SCHEDULED").toUpperCase();
    const sessionLabel = election?.sessionLabel || "—";
    const startTime = election?.startTime;
    const endTime = election?.endTime;
    const isClosed = Boolean(election?.closed);

    // Status Badge (same colors as dashboard: purple, amber, grey, grey outline; NO green)
    badgeEl.className = "badge-status";
    switch (status) {
        case "ONGOING":
            badgeEl.classList.add("ongoing");
            badgeTextEl.textContent = "Ongoing";
            break;
        case "UPCOMING":
            badgeEl.classList.add("upcoming");
            badgeTextEl.textContent = "Upcoming";
            break;
        case "ENDED":
            badgeEl.classList.add("ended");
            badgeTextEl.textContent = "Ended";
            break;
        case "NOT_SCHEDULED":
        default:
            badgeEl.classList.add("not-scheduled");
            badgeTextEl.textContent = "Not Scheduled";
            break;
    }

    sessionValEl.textContent = sessionLabel;
    startValEl.textContent = formatLocalTime(startTime);
    endValEl.textContent = formatLocalTime(endTime);

    // Closed flag
    closedBadgeEl.className = `badge-closed-flag ${isClosed ? 'closed' : 'open'}`;
    closedBadgeEl.textContent = isClosed ? "Closed" : "Open";
}

function applyLockRules(election) {
    const lockBanner = document.getElementById("settingsLockBanner");
    const lockBannerText = document.getElementById("settingsLockBannerText");
    const sessionInput = document.getElementById("sessionLabelInput");
    const scheduleForm = document.getElementById("scheduleForm");
    const scheduleSubmitBtn = document.getElementById("scheduleSubmitBtn");
    const addPositionForm = document.getElementById("addPositionForm");
    const addPositionSubmitBtn = document.getElementById("addPositionSubmitBtn");
    const addPositionInput = document.getElementById("newPositionName");
    const addPositionHint = document.getElementById("addPositionLockHint");
    const closeElectionBtn = document.getElementById("btnCloseElection");

    const status = (election?.status || "NOT_SCHEDULED").toUpperCase();
    const isClosed = Boolean(election?.closed);

    // Default enables
    lockBanner.classList.remove("show");
    sessionInput.disabled = false;
    sessionInput.readOnly = false;
    scheduleSubmitBtn.disabled = false;
    addPositionSubmitBtn.disabled = false;
    addPositionInput.disabled = false;
    if (addPositionHint) addPositionHint.style.display = "none";

    // 1. Close Election button visibility:
    // Show ONLY when status is ENDED and closed is false
    if (status === "ENDED" && !isClosed) {
        closeElectionBtn.style.display = "inline-flex";
    } else {
        closeElectionBtn.style.display = "none";
    }

    // 2. Lock scenarios:
    if (status === "ONGOING") {
        // ONGOING: disable Schedule, Add Position, and session input
        lockBanner.classList.add("show");
        lockBannerText.textContent = "Election in progress: settings are locked.";
        sessionInput.disabled = true;
        scheduleSubmitBtn.disabled = true;
        addPositionSubmitBtn.disabled = true;
        addPositionInput.disabled = true;

    } else if (status === "ENDED" && !isClosed) {
        // ENDED and closed is false: disable only Add Position
        addPositionSubmitBtn.disabled = true;
        addPositionInput.disabled = true;
        if (addPositionHint) {
            addPositionHint.style.display = "block";
            addPositionHint.textContent = "Close the election or schedule the next session before adding positions.";
        }
        // Schedule and Close stay enabled

    } else if (status === "UPCOMING") {
        // While UPCOMING, fix session label input to current election's label (read-only)
        sessionInput.readOnly = true;

    } else if (status === "ENDED" && isClosed) {
        // Everything enabled; label must be a new later session
    }
}

// -------------------------------------------------------------
// Session Label Prefill Logic
// -------------------------------------------------------------
function evaluateSessionPrefill(election, positions) {
    const sessionInput = document.getElementById("sessionLabelInput");
    if (!sessionInput) return;

    const status = (election?.status || "").toUpperCase();
    const electionLabel = election?.sessionLabel || "";
    const workingPosLabel = positions?.length > 0 ? (positions[0].sessionLabel || "") : "";

    if (status === "UPCOMING" && electionLabel) {
        sessionInput.value = electionLabel;
        sessionInput.readOnly = true;
        return;
    }

    if (status === "ENDED" && electionLabel) {
        // If workingPosLabel is not later than election's sessionLabel, prefill next label
        if (!workingPosLabel || workingPosLabel.localeCompare(electionLabel) <= 0) {
            sessionInput.value = getNextSessionLabel(electionLabel);
            sessionInput.readOnly = false;
            return;
        }
        sessionInput.value = workingPosLabel;
        sessionInput.readOnly = false;
        return;
    }

    if (workingPosLabel) {
        sessionInput.value = workingPosLabel;
        sessionInput.readOnly = false;
        return;
    }

    if (electionLabel) {
        sessionInput.value = electionLabel;
        sessionInput.readOnly = false;
        return;
    }

    sessionInput.value = "";
    sessionInput.readOnly = false;
}

// -------------------------------------------------------------
// Positions Card Roster
// -------------------------------------------------------------
function renderPositionsRoster(positions) {
    const listEl = document.getElementById("positionsPillsList");
    const emptyHintEl = document.getElementById("positionsEmptyHint");
    if (!listEl || !emptyHintEl) return;

    listEl.innerHTML = "";

    if (!Array.isArray(positions) || positions.length === 0) {
        emptyHintEl.style.display = "block";
        emptyHintEl.textContent = "No positions added yet for this session.";
        return;
    }

    emptyHintEl.style.display = "none";

    positions.forEach(pos => {
        const li = document.createElement("li");
        li.className = "position-pill-item";

        const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        iconSvg.setAttribute("viewBox", "0 0 24 24");
        iconSvg.setAttribute("fill", "none");
        iconSvg.setAttribute("stroke", "currentColor");
        iconSvg.setAttribute("stroke-width", "2");
        iconSvg.setAttribute("stroke-linecap", "round");
        iconSvg.setAttribute("stroke-linejoin", "round");
        const pathCheck = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        pathCheck.setAttribute("points", "20 6 9 17 4 12");
        iconSvg.appendChild(pathCheck);

        const spanName = document.createElement("span");
        spanName.textContent = pos.name || "Untitled Position";

        li.appendChild(iconSvg);
        li.appendChild(spanName);
        listEl.appendChild(li);
    });
}

// -------------------------------------------------------------
// UI Feedback & Double-Submit State Helpers
// -------------------------------------------------------------
function showInlineAlert(containerEl, message, isWarning = false) {
    if (!containerEl) return;
    containerEl.textContent = message;
    containerEl.className = `modal-alert show ${isWarning ? 'modal-alert-warning' : 'modal-alert-danger'}`;
}

function hideInlineAlert(containerEl) {
    if (!containerEl) return;
    containerEl.textContent = "";
    containerEl.className = "modal-alert";
}

function setButtonSubmitting(btn, submitting, defaultLabel) {
    isSubmitting = submitting;
    if (!btn) return;
    btn.disabled = submitting;
    if (submitting) {
        btn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            <span>Submitting to blockchain...</span>
        `;
    } else {
        btn.textContent = defaultLabel;
    }
}

function parseBackendError(res) {
    const errorData = res.data;
    let message = "An error occurred while communicating with the server.";

    if (errorData) {
        if (typeof errorData === "string") {
            message = errorData;
        } else if (errorData.message) {
            message = errorData.message;
        }
    }

    if (res.status === 500) {
        const lowerMsg = (message + "").toLowerCase();
        if (lowerMsg.includes("blockchain") || lowerMsg.includes("contract") || lowerMsg.includes("web3") || lowerMsg.includes("transaction")) {
            message = `${message} Nothing was saved.`;
        }
    }

    return message;
}

// -------------------------------------------------------------
// Core Data Loading
// -------------------------------------------------------------
export async function loadSettingsData() {
    try {
        const [elecRes, posRes] = await Promise.all([
            apiFetch("/api/election"),
            apiFetch("/api/admin/positions")
        ]);

        electionData = elecRes.ok ? elecRes.data : null;
        positionsData = posRes.ok && Array.isArray(posRes.data) ? posRes.data : [];

        // 1. Render status banner
        renderStatusBanner(electionData);

        // 2. Prefill session label
        evaluateSessionPrefill(electionData, positionsData);

        // 3. Render positions roster
        renderPositionsRoster(positionsData);

        // 4. Prefill Schedule card inputs if dates exist
        const startInput = document.getElementById("scheduleStartTime");
        const endInput = document.getElementById("scheduleEndTime");
        if (electionData?.startTime && startInput && !startInput.value) {
            startInput.value = toDateTimeLocalInputVal(electionData.startTime);
        }
        if (electionData?.endTime && endInput && !endInput.value) {
            endInput.value = toDateTimeLocalInputVal(electionData.endTime);
        }

        // 5. Apply Lock rules
        applyLockRules(electionData);

    } catch (err) {
        console.error("Failed to load election settings data", err);
    }
}

// -------------------------------------------------------------
// Form Listeners & Action Handlers
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    // Initial fetch
    await loadSettingsData();

    const sessionInput = document.getElementById("sessionLabelInput");
    const sessionAlert = document.getElementById("sessionAlert");

    // Clear session alert on typing
    if (sessionInput) {
        sessionInput.addEventListener("input", () => {
            hideInlineAlert(sessionAlert);
        });
    }

    // ---------------------------------------------------------
    // 1. Schedule Form Handler
    // ---------------------------------------------------------
    const scheduleForm = document.getElementById("scheduleForm");
    const scheduleAlert = document.getElementById("scheduleAlert");
    const scheduleSubmitBtn = document.getElementById("scheduleSubmitBtn");
    const startInput = document.getElementById("scheduleStartTime");
    const endInput = document.getElementById("scheduleEndTime");
    const pastWarningNote = document.getElementById("schedulePastWarningNote");

    // Real-time check for immediate voting warning
    function checkStartPastWarning() {
        if (!startInput.value) {
            if (pastWarningNote) pastWarningNote.classList.remove("show");
            return;
        }
        const startDate = new Date(startInput.value);
        if (startDate.getTime() < Date.now()) {
            if (pastWarningNote) pastWarningNote.classList.add("show");
        } else {
            if (pastWarningNote) pastWarningNote.classList.remove("show");
        }
    }

    if (startInput) {
        startInput.addEventListener("change", checkStartPastWarning);
        startInput.addEventListener("input", checkStartPastWarning);
    }

    if (scheduleForm) {
        scheduleForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            hideInlineAlert(scheduleAlert);
            hideInlineAlert(sessionAlert);

            const sessionLabel = sessionInput.value.trim();
            if (!validateSessionLabel(sessionLabel)) {
                showInlineAlert(sessionAlert, "Session label must be in YYYY/YYYY format (e.g. 2026/2027) with second year = first year + 1.");
                sessionInput.focus();
                return;
            }

            if (!startInput.value || !endInput.value) {
                showInlineAlert(scheduleAlert, "Please select both election start and end times.");
                return;
            }

            const startDate = new Date(startInput.value);
            const endDate = new Date(endInput.value);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                showInlineAlert(scheduleAlert, "Please provide valid date and time inputs.");
                return;
            }

            if (startDate.getTime() >= endDate.getTime()) {
                showInlineAlert(scheduleAlert, "Election start time must be before end time.");
                return;
            }

            setButtonSubmitting(scheduleSubmitBtn, true, "Save Election Schedule");

            try {
                const res = await apiFetch("/api/admin/election/schedule", {
                    method: "POST",
                    body: {
                        sessionLabel,
                        startTime: startDate.toISOString(),
                        endTime: endDate.toISOString()
                    }
                });

                if (res.ok) {
                    showToast("Election schedule saved successfully");
                    await loadSettingsData();
                } else {
                    const msg = parseBackendError(res);
                    showInlineAlert(scheduleAlert, msg);
                }
            } catch (networkError) {
                showInlineAlert(scheduleAlert, networkError.message || "Network request failed");
            } finally {
                setButtonSubmitting(scheduleSubmitBtn, false, "Save Election Schedule");
            }
        });
    }

    // ---------------------------------------------------------
    // 2. Add Position Form Handler
    // ---------------------------------------------------------
    const addPositionForm = document.getElementById("addPositionForm");
    const addPositionInput = document.getElementById("newPositionName");
    const addPositionAlert = document.getElementById("addPositionAlert");
    const addPositionSubmitBtn = document.getElementById("addPositionSubmitBtn");

    if (addPositionForm) {
        addPositionForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            hideInlineAlert(addPositionAlert);
            hideInlineAlert(sessionAlert);

            const sessionLabel = sessionInput.value.trim();
            if (!validateSessionLabel(sessionLabel)) {
                showInlineAlert(sessionAlert, "Session label must be in YYYY/YYYY format (e.g. 2026/2027) with second year = first year + 1.");
                sessionInput.focus();
                return;
            }

            const positionName = addPositionInput.value.trim();
            if (!positionName) {
                showInlineAlert(addPositionAlert, "Please enter a position name.");
                addPositionInput.focus();
                return;
            }

            setButtonSubmitting(addPositionSubmitBtn, true, "Add Position");

            try {
                const res = await apiFetch("/api/admin/positions", {
                    method: "POST",
                    body: {
                        name: positionName,
                        sessionLabel
                    }
                });

                if (res.ok) {
                    addPositionInput.value = "";
                    showToast("Position added successfully");
                    await loadSettingsData();
                } else {
                    const msg = parseBackendError(res);
                    showInlineAlert(addPositionAlert, msg);
                }
            } catch (networkError) {
                showInlineAlert(addPositionAlert, networkError.message || "Network request failed");
            } finally {
                setButtonSubmitting(addPositionSubmitBtn, false, "Add Position");
            }
        });
    }

    // ---------------------------------------------------------
    // 3. Close Election Modal & Action Handler
    // ---------------------------------------------------------
    const closeElectionBtn = document.getElementById("btnCloseElection");
    const confirmCloseBtn = document.getElementById("confirmCloseElectionBtn");
    const closeCancelBtn = document.getElementById("closeModalCancelBtn");
    const closeAlert = document.getElementById("closeModalAlert");

    if (closeElectionBtn) {
        closeElectionBtn.addEventListener("click", () => {
            hideInlineAlert(closeAlert);
            const modalEl = document.getElementById("closeElectionModal");
            const modalInstance = new bootstrap.Modal(modalEl);
            modalInstance.show();
        });
    }

    if (confirmCloseBtn) {
        confirmCloseBtn.addEventListener("click", async () => {
            if (isSubmitting) return;

            hideInlineAlert(closeAlert);
            setButtonSubmitting(confirmCloseBtn, true, "Confirm Close Election");
            if (closeCancelBtn) closeCancelBtn.disabled = true;

            try {
                const res = await apiFetch("/api/admin/election/close", {
                    method: "POST"
                });

                if (res.ok) {
                    const modalEl = document.getElementById("closeElectionModal");
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) modalInstance.hide();

                    showToast("Election closed successfully");
                    await loadSettingsData();
                } else {
                    const msg = parseBackendError(res);
                    showInlineAlert(closeAlert, msg);
                }
            } catch (networkError) {
                showInlineAlert(closeAlert, networkError.message || "Network request failed");
            } finally {
                setButtonSubmitting(confirmCloseBtn, false, "Confirm Close Election");
                if (closeCancelBtn) closeCancelBtn.disabled = false;
            }
        });
    }
});
