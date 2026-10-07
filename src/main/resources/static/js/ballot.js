/**
 * UDUS SUG Blockchain Voting System - Official Ballot Page (V3)
 *
 * Handles voter ballot rendering, candidate selection, review modal,
 * and irreversible blockchain vote submission.
 *
 * Strict Anonymity:
 * - Voting token stored only in sessionStorage, never displayed or logged
 * - Zero voter identifiers sent, stored, or displayed
 * - Zero storage of ballot selections
 * - Parallel arrays in POST /api/vote with abstained positions omitted
 */

import { apiRequest } from "./api.js";
import { showAlert, setButtonLoading } from "./ui.js";

// Helper: Parse date strings treating un-offset timestamps as WAT (+01:00)
function parseWatDate(dateStr) {
    if (!dateStr) return null;
    let s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) {
        s = s.replace(" ", "T") + "+01:00";
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

// GUARD: Immediate check on script execution
function checkAuthGuard() {
    const token = sessionStorage.getItem("votingToken");
    if (!token || !token.trim()) {
        window.location.replace("login.html");
        return false;
    }

    const expiresAt = sessionStorage.getItem("votingTokenExpiresAt");
    if (expiresAt) {
        const expDate = parseWatDate(expiresAt);
        if (expDate && expDate.getTime() <= Date.now()) {
            sessionStorage.removeItem("votingToken");
            sessionStorage.removeItem("votingTokenExpiresAt");
            window.location.replace("login.html");
            return false;
        }
    }
    return true;
}

if (!checkAuthGuard()) {
    // Redirecting, halt further script execution
    throw new Error("Voting session missing or expired.");
}

// Helper: HTML entity escaping
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper: Initials for placeholder avatars
function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Curated avatar palettes matching reference design
const AVATAR_PALETTES = [
    { bg: "#EDE8F8", color: "#372859" },
    { bg: "#E0E7FF", color: "#3730A3" },
    { bg: "#E0F2FE", color: "#0369A1" },
    { bg: "#FCE7F3", color: "#9D174D" },
    { bg: "#FEF3C7", color: "#92400E" },
    { bg: "#DCFCE7", color: "#166534" }
];

function getAvatarPalette(id) {
    const num = Math.abs(Number(id) || 0);
    return AVATAR_PALETTES[num % AVATAR_PALETTES.length];
}

// Render candidate avatar (image or initial avatar placeholder)
function renderCandidateAvatar(cand) {
    if (cand.photoUrl && typeof cand.photoUrl === "string" && cand.photoUrl.trim() !== "") {
        return `<img src="${escapeHtml(cand.photoUrl.trim())}" alt="${escapeHtml(cand.name)}" class="candidate-photo">`;
    }
    const palette = getAvatarPalette(cand.candidateId);
    const initials = getInitials(cand.name);
    return `
        <div class="candidate-avatar-initials" style="background-color: ${palette.bg}; color: ${palette.color};" aria-hidden="true">
            <span>${escapeHtml(initials)}</span>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    // Secondary guard verification inside DOMContentLoaded
    if (!checkAuthGuard()) return;

    // DOM Elements
    const positionsContainer = document.getElementById("positionsContainer");
    const alertContainer = document.getElementById("alert-container");
    const reviewSubmitBtn = document.getElementById("reviewSubmitBtn");
    const actionsNote = document.getElementById("actionsNote");
    const logoutBtn = document.getElementById("logoutBtn");
    const headerTimerPill = document.getElementById("headerTimerPill");
    const headerCountdownDisplay = document.getElementById("headerCountdownDisplay");

    // Modal DOM Elements
    const reviewModalEl = document.getElementById("reviewModal");
    const modalAlertContainer = document.getElementById("modalAlertContainer");
    const reviewSelectionsList = document.getElementById("reviewSelectionsList");
    const confirmVoteBtn = document.getElementById("confirmVoteBtn");
    const goBackBtn = document.getElementById("goBackBtn");
    const modalCloseBtn = document.getElementById("modalCloseBtn");

    const reviewModalInstance = new bootstrap.Modal(reviewModalEl, {
        backdrop: "static",
        keyboard: false
    });

    // In-memory state (NEVER persisted to localStorage/sessionStorage)
    let activePositions = [];
    let candidatesMap = new Map(); // candidateId -> candidateObj
    let selections = new Map(); // positionId -> candidateId (number) | 'abstain'
    let isCasting = false;
    let timerInterval = null;

    // -------------------------------------------------------------
    // Header & Logout Management
    // -------------------------------------------------------------
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.removeItem("votingToken");
            sessionStorage.removeItem("votingTokenExpiresAt");
            window.location.replace("index.html");
        });
    }

    // -------------------------------------------------------------
    // Countdown Timer Management
    // -------------------------------------------------------------
    function initCountdown() {
        const expiresAtStr = sessionStorage.getItem("votingTokenExpiresAt");
        if (!expiresAtStr) return;

        const expiresDate = parseWatDate(expiresAtStr);
        if (!expiresDate) return;

        if (headerTimerPill) {
            headerTimerPill.style.display = "inline-flex";
        }

        function updateCountdown() {
            const now = Date.now();
            const totalSeconds = Math.floor((expiresDate.getTime() - now) / 1000);

            if (totalSeconds <= 0) {
                if (timerInterval) clearInterval(timerInterval);
                sessionStorage.removeItem("votingToken");
                sessionStorage.removeItem("votingTokenExpiresAt");

                if (reviewModalInstance) {
                    reviewModalInstance.hide();
                }

                showSessionTerminatedAlert("Your session has expired.");
                if (headerCountdownDisplay) {
                    headerCountdownDisplay.textContent = "00:00";
                }
                return;
            }

            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

            if (headerCountdownDisplay) {
                headerCountdownDisplay.textContent = formatted;
            }

            if (totalSeconds <= 120 && headerTimerPill) {
                headerTimerPill.classList.add("timer-urgent");
            }
        }

        updateCountdown();
        timerInterval = setInterval(updateCountdown, 1000);
    }

    initCountdown();

    // -------------------------------------------------------------
    // Helper: Termination UI State
    // -------------------------------------------------------------
    function showSessionTerminatedAlert(message) {
        alertContainer.innerHTML = "";
        const alertBox = document.createElement("div");
        alertBox.className = "alert alert-danger p-4 text-center shadow-sm";
        alertBox.setAttribute("role", "alert");

        alertBox.innerHTML = `
            <div class="mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <h4 class="alert-heading fw-bold mb-2">Voting Session Ended</h4>
            <p class="mb-3 text-secondary">${escapeHtml(message)}</p>
            <a href="login.html" class="btn btn-udus px-4 py-2">Return to Login</a>
        `;

        alertContainer.appendChild(alertBox);
        permanentlyDisableBallot();
    }

    function permanentlyDisableBallot() {
        if (reviewSubmitBtn) {
            reviewSubmitBtn.disabled = true;
            reviewSubmitBtn.classList.add("disabled");
        }
        if (actionsNote) {
            actionsNote.textContent = "Ballot submission is closed.";
        }
        const optionCards = document.querySelectorAll(".candidate-option-card, input[type='radio']");
        optionCards.forEach(el => {
            el.style.pointerEvents = "none";
            if (el.tagName === "INPUT") el.disabled = true;
        });
    }

    // -------------------------------------------------------------
    // Submit Button Validation State
    // -------------------------------------------------------------
    function updateSubmitButtonState() {
        let hasCandidateSelected = false;
        for (const [posId, choice] of selections.entries()) {
            if (choice !== "abstain" && choice !== null && choice !== undefined) {
                hasCandidateSelected = true;
                break;
            }
        }

        if (hasCandidateSelected) {
            reviewSubmitBtn.disabled = false;
            reviewSubmitBtn.classList.remove("disabled");
            actionsNote.textContent = "You can proceed to review your selections.";
        } else {
            reviewSubmitBtn.disabled = true;
            reviewSubmitBtn.classList.add("disabled");
            actionsNote.textContent = "Please make a selection for each position to continue.";
        }
    }

    // -------------------------------------------------------------
    // Data Loading: /api/positions and /api/candidates
    // -------------------------------------------------------------
    async function loadBallotData() {
        alertContainer.innerHTML = "";
        positionsContainer.innerHTML = `
            <div class="ballot-loading-card text-center py-5">
                <div class="spinner-border text-purple" style="color: #372859; width: 2.75rem; height: 2.75rem;" role="status">
                    <span class="visually-hidden">Loading ballot...</span>
                </div>
                <p class="mt-3 text-muted">Loading official election ballot...</p>
            </div>
        `;

        try {
            const [positionsRes, candidatesRes] = await Promise.all([
                apiRequest("/api/positions"),
                apiRequest("/api/candidates")
            ]);

            if (!positionsRes.ok || !candidatesRes.ok) {
                renderLoadError("Unable to load ballot data. Please check your connection and try again.");
                return;
            }

            const rawPositions = Array.isArray(positionsRes.data) ? positionsRes.data : [];
            const rawCandidates = Array.isArray(candidatesRes.data) ? candidatesRes.data : [];

            if (rawCandidates.length === 0) {
                positionsContainer.innerHTML = `
                    <div class="alert alert-info py-4 text-center" role="status">
                        <p class="mb-0 fw-medium">No candidates are available yet.</p>
                    </div>
                `;
                reviewSubmitBtn.disabled = true;
                reviewSubmitBtn.classList.add("disabled");
                return;
            }

            // Normalize candidates
            candidatesMap.clear();
            const candidatesByPosition = new Map();

            rawCandidates.forEach(item => {
                const candId = item.candidateId !== undefined ? item.candidateId : item.id;
                const cand = {
                    candidateId: Number(candId),
                    name: item.name || "Candidate",
                    department: item.department || "",
                    positionId: Number(item.positionId),
                    photoUrl: item.photoUrl || null
                };
                candidatesMap.set(cand.candidateId, cand);

                if (!candidatesByPosition.has(cand.positionId)) {
                    candidatesByPosition.set(cand.positionId, []);
                }
                candidatesByPosition.get(cand.positionId).push(cand);
            });

            // Normalize and sort positions in ascending id order
            const normalizedPositions = rawPositions.map(item => {
                const id = item.id !== undefined ? item.id : item.positionId;
                const title = item.title || item.name || item.positionName || `Position ${id}`;
                return { id: Number(id), title };
            }).sort((a, b) => a.id - b.id);

            // Filter out any position that has no candidates
            activePositions = normalizedPositions.filter(pos => {
                const list = candidatesByPosition.get(pos.id);
                return list && list.length > 0;
            });

            if (activePositions.length === 0) {
                positionsContainer.innerHTML = `
                    <div class="alert alert-info py-4 text-center" role="status">
                        <p class="mb-0 fw-medium">No candidates are available yet.</p>
                    </div>
                `;
                reviewSubmitBtn.disabled = true;
                reviewSubmitBtn.classList.add("disabled");
                return;
            }

            // Render ballot positions
            renderBallot(activePositions, candidatesByPosition);
        } catch {
            renderLoadError("Unable to load ballot data. Please check your connection and try again.");
        }
    }

    function renderLoadError(message) {
        positionsContainer.innerHTML = "";
        alertContainer.innerHTML = `
            <div class="alert alert-danger d-flex align-items-center justify-content-between p-3" role="alert">
                <div class="d-flex align-items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>${escapeHtml(message)}</span>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger" id="retryLoadBtn">Retry</button>
            </div>
        `;

        const retryBtn = document.getElementById("retryLoadBtn");
        if (retryBtn) {
            retryBtn.addEventListener("click", loadBallotData);
        }

        reviewSubmitBtn.disabled = true;
        reviewSubmitBtn.classList.add("disabled");
    }

    // -------------------------------------------------------------
    // Render Ballot DOM
    // -------------------------------------------------------------
    function renderBallot(positions, candidatesByPosition) {
        positionsContainer.innerHTML = "";
        selections.clear();

        positions.forEach(pos => {
            // Default: Abstain is selected for every position
            selections.set(pos.id, "abstain");

            const positionCard = document.createElement("article");
            positionCard.className = "position-card";
            positionCard.dataset.positionId = String(pos.id);
            positionCard.setAttribute("aria-labelledby", `pos-title-${pos.id}`);

            // Header of position card
            const header = document.createElement("header");
            header.className = "position-header";
            header.innerHTML = `
                <div class="position-icon-circle" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </div>
                <div class="position-header-text">
                    <h2 id="pos-title-${pos.id}" class="position-title">${escapeHtml(pos.title)}</h2>
                    <p class="position-subtitle">Choose one candidate for the position of ${escapeHtml(pos.title)}.</p>
                </div>
            `;
            positionCard.appendChild(header);

            // Candidates row grid
            const grid = document.createElement("div");
            grid.className = "candidates-grid";
            grid.setAttribute("role", "radiogroup");
            grid.setAttribute("aria-labelledby", `pos-title-${pos.id}`);

            const candidatesList = candidatesByPosition.get(pos.id) || [];

            // 1. Candidate option cards
            candidatesList.forEach(cand => {
                const candCard = document.createElement("div");
                candCard.className = "candidate-option-card";
                candCard.dataset.type = "candidate";
                candCard.dataset.positionId = String(pos.id);
                candCard.dataset.candidateId = String(cand.candidateId);
                candCard.tabIndex = 0;
                candCard.setAttribute("role", "radio");
                candCard.setAttribute("aria-checked", "false");

                candCard.innerHTML = `
                    <input type="radio" class="candidate-radio-hidden" name="position_${pos.id}" value="${cand.candidateId}" id="radio_pos_${pos.id}_cand_${cand.candidateId}" aria-hidden="true">
                    <div class="card-radio-indicator" aria-hidden="true">
                        <div class="radio-dot"></div>
                    </div>
                    <div class="candidate-avatar-wrap">
                        ${renderCandidateAvatar(cand)}
                    </div>
                    <h3 class="candidate-name">${escapeHtml(cand.name)}</h3>
                    <p class="candidate-department">${escapeHtml(cand.department)}</p>
                `;

                grid.appendChild(candCard);
            });

            // 2. Abstain option card (selected by default)
            const abstainCard = document.createElement("div");
            abstainCard.className = "candidate-option-card abstain-card selected";
            abstainCard.dataset.type = "abstain";
            abstainCard.dataset.positionId = String(pos.id);
            abstainCard.dataset.candidateId = "abstain";
            abstainCard.tabIndex = 0;
            abstainCard.setAttribute("role", "radio");
            abstainCard.setAttribute("aria-checked", "true");

            abstainCard.innerHTML = `
                <input type="radio" class="candidate-radio-hidden" name="position_${pos.id}" value="abstain" id="radio_pos_${pos.id}_abstain" checked aria-hidden="true">
                <div class="card-radio-indicator" aria-hidden="true">
                    <div class="radio-dot"></div>
                </div>
                <div class="abstain-icon-wrap" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                </div>
                <h3 class="abstain-title">Abstain from this position</h3>
                <p class="abstain-subtitle">I do not want to choose any candidate.</p>
            `;

            grid.appendChild(abstainCard);
            positionCard.appendChild(grid);
            positionsContainer.appendChild(positionCard);
        });

        // Setup interaction listeners on cards
        setupSelectionListeners();
        updateSubmitButtonState();
    }

    // -------------------------------------------------------------
    // Candidate & Abstain Selection Handlers
    // -------------------------------------------------------------
    function setupSelectionListeners() {
        const cards = document.querySelectorAll(".candidate-option-card");

        cards.forEach(card => {
            const selectCard = () => {
                const posId = Number(card.dataset.positionId);
                const isAbstain = card.dataset.type === "abstain";
                const candId = isAbstain ? "abstain" : Number(card.dataset.candidateId);

                // Update selections map
                selections.set(posId, candId);

                // Find all cards in this position
                const groupCards = document.querySelectorAll(`.candidate-option-card[data-position-id="${posId}"]`);
                groupCards.forEach(c => {
                    c.classList.remove("selected");
                    c.setAttribute("aria-checked", "false");
                    const r = c.querySelector("input[type='radio']");
                    if (r) r.checked = false;
                });

                // Set this card as selected
                card.classList.add("selected");
                card.setAttribute("aria-checked", "true");
                const radio = card.querySelector("input[type='radio']");
                if (radio) radio.checked = true;

                updateSubmitButtonState();
            };

            card.addEventListener("click", selectCard);
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectCard();
                }
            });
        });
    }

    // -------------------------------------------------------------
    // Review Modal Open & Population
    // -------------------------------------------------------------
    reviewSubmitBtn.addEventListener("click", () => {
        if (reviewSubmitBtn.disabled) return;

        modalAlertContainer.innerHTML = "";
        reviewSelectionsList.innerHTML = "";

        activePositions.forEach(pos => {
            const choice = selections.get(pos.id);
            const row = document.createElement("div");
            row.className = "review-item";

            if (choice === "abstain" || choice === null || choice === undefined) {
                row.innerHTML = `
                    <div class="review-pos-name">${escapeHtml(pos.title)}</div>
                    <div class="review-choice">
                        <span class="badge-abstained">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                            </svg>
                            Abstained
                        </span>
                    </div>
                `;
            } else {
                const cand = candidatesMap.get(Number(choice));
                const candName = cand ? cand.name : `Candidate #${choice}`;
                const candDept = cand ? cand.department : "";

                row.innerHTML = `
                    <div class="review-pos-name">${escapeHtml(pos.title)}</div>
                    <div class="review-choice">
                        <div class="review-cand-info">
                            <span class="review-cand-name">${escapeHtml(candName)}</span>
                            ${candDept ? `<span class="review-cand-dept">${escapeHtml(candDept)}</span>` : ""}
                        </div>
                        <span class="badge-selected-check">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Selected
                        </span>
                    </div>
                `;
            }

            reviewSelectionsList.appendChild(row);
        });

        reviewModalInstance.show();
    });

    // -------------------------------------------------------------
    // Vote Casting: POST /api/vote
    // -------------------------------------------------------------
    function beforeUnloadHandler(e) {
        e.preventDefault();
        e.returnValue = "";
    }

    confirmVoteBtn.addEventListener("click", async () => {
        if (isCasting) return;

        modalAlertContainer.innerHTML = "";
        alertContainer.innerHTML = "";

        // Read token from sessionStorage strictly at the moment of sending
        const token = sessionStorage.getItem("votingToken");
        if (!token || !token.trim()) {
            reviewModalInstance.hide();
            window.location.replace("login.html");
            return;
        }

        // Build parallel arrays: include ONLY positions where a candidate was selected
        const positionIds = [];
        const candidateIds = [];

        for (const pos of activePositions) {
            const chosen = selections.get(pos.id);
            if (chosen !== "abstain" && chosen !== null && chosen !== undefined) {
                positionIds.push(Number(pos.id));
                candidateIds.push(Number(chosen));
            }
        }

        if (positionIds.length === 0) {
            showAlert(modalAlertContainer, "Please select at least one candidate before submitting.", "danger");
            return;
        }

        // Lock down modal & initiate casting state
        isCasting = true;
        setButtonLoading(confirmVoteBtn, true, "Casting your vote. Please do not refresh or close this page.");
        goBackBtn.disabled = true;
        modalCloseBtn.disabled = true;
        window.addEventListener("beforeunload", beforeUnloadHandler);

        try {
            const response = await apiRequest("/api/vote", {
                method: "POST",
                body: {
                    token,
                    positionIds,
                    candidateIds
                }
            });

            // Clean up unload listener
            window.removeEventListener("beforeunload", beforeUnloadHandler);

            // 1. Success (HTTP 200)
            if (response.ok && response.status === 200) {
                const txHash = response.data && response.data.transactionHash ? response.data.transactionHash : "";
                if (txHash) {
                    sessionStorage.setItem("lastTxHash", txHash);
                }

                // Clean up token keys
                sessionStorage.removeItem("votingToken");
                sessionStorage.removeItem("votingTokenExpiresAt");

                // Replace location so back button cannot return to ballot
                const targetUrl = txHash ? `receipt.html?txHash=${encodeURIComponent(txHash)}` : "receipt.html";
                window.location.replace(targetUrl);
                return;
            }

            // 2. Client / Validation Error (HTTP 400)
            // Close modal; keep token and selections so voter can retry
            if (response.status === 400) {
                resetModalCastingState();
                reviewModalInstance.hide();
                let message = "Unable to submit vote. Please try again.";
                if (response.data && typeof response.data === "object" && response.data.message) {
                    message = response.data.message;
                } else if (typeof response.data === "string" && response.data.trim()) {
                    message = response.data;
                }
                showAlert(alertContainer, message, "danger");
                return;
            }

            // 3. Unauthorized / Invalid Session (HTTP 401)
            if (response.status === 401) {
                sessionStorage.removeItem("votingToken");
                sessionStorage.removeItem("votingTokenExpiresAt");
                reviewModalInstance.hide();
                showSessionTerminatedAlert("Your voting session is invalid. Please log in again.");
                return;
            }

            // 4. Conflict / Already Submitted (HTTP 409)
            if (response.status === 409) {
                sessionStorage.removeItem("votingToken");
                sessionStorage.removeItem("votingTokenExpiresAt");
                reviewModalInstance.hide();
                showSessionTerminatedAlert("This ballot has already been submitted.");
                return;
            }

            // 5. Expired Session (HTTP 410)
            if (response.status === 410) {
                sessionStorage.removeItem("votingToken");
                sessionStorage.removeItem("votingTokenExpiresAt");
                reviewModalInstance.hide();
                showSessionTerminatedAlert("Your voting session has expired. Please log in again.");
                return;
            }

            // 6. Ambiguous Outcome (HTTP 500, status 0, or network failure)
            // Do NOT clear token. Do NOT redirect. Do NOT auto-retry. Leave submit disabled.
            if (response.status === 500 || response.status === 0 || !response.status) {
                reviewModalInstance.hide();
                showAlert(alertContainer, "We could not confirm your vote. Do not vote again. Please contact the election committee.", "warning");
                permanentlyDisableBallot();
                return;
            }

            // 7. Anything else
            resetModalCastingState();
            reviewModalInstance.hide();
            let errorMessage = "Unable to continue. Please try again.";
            if (response.data && typeof response.data === "object" && response.data.message) {
                errorMessage = response.data.message;
            }
            showAlert(alertContainer, errorMessage, "danger");
        } catch {
            // Ambiguous network/runtime failure
            window.removeEventListener("beforeunload", beforeUnloadHandler);
            reviewModalInstance.hide();
            showAlert(alertContainer, "We could not confirm your vote. Do not vote again. Please contact the election committee.", "warning");
            permanentlyDisableBallot();
        }
    });

    function resetModalCastingState() {
        isCasting = false;
        setButtonLoading(confirmVoteBtn, false);
        goBackBtn.disabled = false;
        modalCloseBtn.disabled = false;
    }

    // Initial ballot loading trigger
    loadBallotData();
});
