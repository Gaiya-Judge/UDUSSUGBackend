/**
 * UDUS SUG Blockchain Voting System - Voter Login (V1)
 *
 * Handles voter authentication initiation:
 * - Validates admission number input (inline validation error)
 * - Submits to POST /api/voter/auth/login
 * - Sets pendingAdmission in sessionStorage on HTTP 200 and redirects to verify.html
 * - Pop-ups for request errors (404, 401, 409, 5xx / Network)
 * - Part C item 5: Banner for vote in progress on this device
 */

import { apiRequest } from "./api.js";
import { showAlert, setButtonLoading } from "./ui.js";
import {
    purgeVotingToken,
    getVotingToken,
    clearVotingToken,
    checkTokenStatus,
    runCheckMyVote,
    saveReceipt
} from "./voter-session.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const admissionInput = document.getElementById("admissionNumber");
    const submitBtn = document.getElementById("loginSubmitBtn");
    const alertContainer = document.getElementById("alert-container");
    const bannerContainer = document.getElementById("voteInProgressBanner");

    if (!loginForm || !admissionInput || !submitBtn || !alertContainer) {
        return;
    }

    // Part C Item 5: Purge voting token and display vote in progress banner if active
    setupVoteInProgressBanner();

    function setupVoteInProgressBanner() {
        const token = purgeVotingToken();
        if (!token || !bannerContainer) {
            if (bannerContainer) {
                bannerContainer.style.display = "none";
                bannerContainer.replaceChildren();
            }
            return;
        }

        bannerContainer.replaceChildren();
        bannerContainer.style.display = "block";

        const titleEl = document.createElement("p");
        titleEl.className = "vote-in-progress-title";
        titleEl.textContent = "You have a vote in progress on this device.";

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "vote-in-progress-actions";

        // "Continue voting" button
        const continueBtn = document.createElement("button");
        continueBtn.type = "button";
        continueBtn.className = "btn-banner-action primary";
        continueBtn.textContent = "Continue voting";
        continueBtn.addEventListener("click", async () => {
            continueBtn.disabled = true;
            continueBtn.textContent = "Checking...";
            const activeToken = getVotingToken();
            if (!activeToken) {
                hideBannerAndShowExpired();
                return;
            }

            const statusRes = await checkTokenStatus(activeToken);
            if (statusRes.status === "VALID") {
                window.location.href = "ballot.html";
                return;
            }

            if (statusRes.status === "USED") {
                saveReceipt(statusRes.transactionHash);
                clearVotingToken();
                const targetUrl = statusRes.transactionHash
                    ? `receipt.html?txHash=${encodeURIComponent(statusRes.transactionHash)}`
                    : "receipt.html?unavailable=1";
                window.location.href = targetUrl;
                return;
            }

            // Otherwise EXPIRED or UNKNOWN
            hideBannerAndShowExpired();
        });

        // "Check my vote" button (Part C item 3)
        const checkVoteBtn = document.createElement("button");
        checkVoteBtn.type = "button";
        checkVoteBtn.className = "btn-banner-action secondary";
        checkVoteBtn.textContent = "Check my vote";
        checkVoteBtn.addEventListener("click", () => {
            runCheckMyVote();
        });

        actionsDiv.appendChild(continueBtn);
        actionsDiv.appendChild(checkVoteBtn);

        // Small "Not you? Clear this session" link
        const clearLink = document.createElement("button");
        clearLink.type = "button";
        clearLink.className = "banner-clear-link";
        clearLink.textContent = "Not you? Clear this session";
        clearLink.addEventListener("click", () => {
            clearVotingToken();
            bannerContainer.style.display = "none";
            bannerContainer.replaceChildren();
        });

        bannerContainer.appendChild(titleEl);
        bannerContainer.appendChild(actionsDiv);
        bannerContainer.appendChild(clearLink);
    }

    function hideBannerAndShowExpired() {
        clearVotingToken();
        if (bannerContainer) {
            bannerContainer.style.display = "none";
            bannerContainer.replaceChildren();
        }
        if (window.UdusPopup) {
            window.UdusPopup.show({
                type: "warning",
                icon: "clock",
                title: "Session expired",
                message: "Your voting session has expired. Please log in again.",
                primary: {
                    label: "Log in again",
                    onClick: () => window.UdusPopup.close()
                },
                dismissible: false
            });
        }
    }

    // Check election status on load: if not ONGOING, show advisory notice
    checkElectionStatus();

    async function checkElectionStatus() {
        try {
            const response = await apiRequest("/api/election");
            if (response.ok && response.data) {
                const status = (response.data.status || "").toUpperCase();
                if (status && status !== "ONGOING") {
                    showAlert(alertContainer, "Voting is not open right now.", "warning");
                }
            }
        } catch {
            // Silently ignore so login remains unaffected
        }
    }

    let isSubmitting = false;

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        // Clear previous inline alerts
        alertContainer.replaceChildren();

        const admissionNumber = admissionInput.value.trim();

        // Client-side empty check stays inline next to field
        if (!admissionNumber) {
            showAlert(alertContainer, "Please enter your admission number.", "danger");
            admissionInput.focus();
            return;
        }

        isSubmitting = true;
        setButtonLoading(submitBtn, true, "Please wait...");

        try {
            const response = await apiRequest("/api/voter/auth/login", {
                method: "POST",
                body: {
                    admissionNumber
                }
            });

            if (response.ok && response.status === 200) {
                // Success: store in sessionStorage only (never in localStorage or URL)
                sessionStorage.setItem("pendingAdmission", admissionNumber);
                window.location.href = "verify.html";
                return;
            }

            // Error handling matching Part B specification with Pop-ups
            if (response.status === 404) {
                // 404 -> error, "Admission number not found", "We could not find that admission number. Check it and try again." [Try again]
                window.UdusPopup.show({
                    type: "error",
                    icon: "error",
                    title: "Admission number not found",
                    message: "We could not find that admission number. Check it and try again.",
                    primary: {
                        label: "Try again",
                        onClick: () => {
                            window.UdusPopup.close();
                            admissionInput.focus();
                        }
                    },
                    dismissible: true
                });
            } else if (response.status === 401) {
                // 401 -> lock, "Not eligible to vote", "This admission number is not eligible to vote in this election. Contact the SUG ICT Team." [OK]
                window.UdusPopup.show({
                    type: "error",
                    icon: "lock",
                    title: "Not eligible to vote",
                    message: "This admission number is not eligible to vote in this election. Contact the SUG ICT Team.",
                    primary: {
                        label: "OK",
                        onClick: () => window.UdusPopup.close()
                    },
                    dismissible: true
                });
            } else if (response.status === 409) {
                // 409 -> no-entry, "Voting is not open", backend message, [Back to Home] and [OK]
                const rawMsg = (response.data && response.data.message) || "";
                const safeMsg = window.UdusPopup.safeMessage(response.status, rawMsg, "Voting is not open right now.");
                window.UdusPopup.show({
                    type: "error",
                    icon: "no-entry",
                    title: "Voting is not open",
                    message: safeMsg,
                    secondary: {
                        label: "Back to Home",
                        href: "index.html"
                    },
                    primary: {
                        label: "OK",
                        onClick: () => window.UdusPopup.close()
                    },
                    dismissible: true
                });
            } else if (response.status === 0 || response.status >= 500) {
                // Network or 5xx -> offline, "Connection problem", "We could not reach the server. Check your internet connection and try again." [Try again]
                window.UdusPopup.show({
                    type: "error",
                    icon: "offline",
                    title: "Connection problem",
                    message: "We could not reach the server. Check your internet connection and try again.",
                    primary: {
                        label: "Try again",
                        onClick: () => window.UdusPopup.close()
                    },
                    dismissible: true
                });
            } else {
                const rawMsg = (response.data && response.data.message) || "";
                const safeMsg = window.UdusPopup.safeMessage(response.status, rawMsg, "Unable to continue. Please try again.");
                window.UdusPopup.show({
                    type: "error",
                    icon: "error",
                    title: "Unable to continue",
                    message: safeMsg,
                    primary: {
                        label: "OK",
                        onClick: () => window.UdusPopup.close()
                    },
                    dismissible: true
                });
            }
        } catch {
            window.UdusPopup.show({
                type: "error",
                icon: "offline",
                title: "Connection problem",
                message: "We could not reach the server. Check your internet connection and try again.",
                primary: {
                    label: "Try again",
                    onClick: () => window.UdusPopup.close()
                },
                dismissible: true
            });
        } finally {
            isSubmitting = false;
            setButtonLoading(submitBtn, false);
        }
    });
});
