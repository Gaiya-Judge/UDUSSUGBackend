/**
 * UDUS SUG Blockchain Voting System - Voter OTP Verification (V2)
 *
 * Handles voter identity verification via one-time code:
 * - Guards page: redirects to login.html if sessionStorage.pendingAdmission is missing
 * - Segmented 6-digit numeric input with non-digit stripping (inline validation)
 * - Submits to POST /api/voter/auth/verify-otp
 * - Stores votingToken in localStorage via voter-session.js upon HTTP 200 and redirects to ballot.html
 * - Pop-ups for request errors (401, 410, 409 ballot issued / not open, 5xx / Network)
 * - Manages 02:45 countdown and resend OTP action
 */

import { apiRequest } from "./api.js";
import { showAlert, setButtonLoading } from "./ui.js";
import { setVotingToken, hasVotingToken, runCheckMyVote } from "./voter-session.js";

// GUARD: Immediate check on script execution
const pendingAdmission = sessionStorage.getItem("pendingAdmission");
if (!pendingAdmission || !pendingAdmission.trim()) {
    window.location.replace("login.html");
}

document.addEventListener("DOMContentLoaded", () => {
    // Secondary guard in case DOM loaded after redirect
    if (!pendingAdmission || !pendingAdmission.trim()) {
        return;
    }

    const verifyForm = document.getElementById("verifyForm");
    const otpInput = document.getElementById("otpInput");
    const otpBoxes = Array.from(document.querySelectorAll(".otp-box"));
    const submitBtn = document.getElementById("verifySubmitBtn");
    const alertContainer = document.getElementById("alert-container");
    const resendWrapper = document.getElementById("resendWrapper");

    if (!verifyForm || !otpInput || !submitBtn || !alertContainer) {
        return;
    }

    let isSubmitting = false;

    // Helper: update visual 6-digit boxes to mirror hidden input value
    function updateOtpBoxes() {
        const val = otpInput.value;
        const isInputFocused = document.activeElement === otpInput;
        const activeIndex = Math.min(val.length, 5);

        otpBoxes.forEach((box, idx) => {
            if (idx < val.length) {
                box.textContent = val[idx];
                box.classList.add("filled");
                box.classList.remove("empty");
            } else {
                box.textContent = "—";
                box.classList.remove("filled");
                box.classList.add("empty");
            }

            box.classList.toggle("focused", isInputFocused && idx === activeIndex);
        });
    }

    // Strip non-digit characters on input and paste
    otpInput.addEventListener("input", () => {
        const cleaned = otpInput.value.replace(/\D/g, "").slice(0, 6);
        otpInput.value = cleaned;
        updateOtpBoxes();
    });

    otpInput.addEventListener("focus", updateOtpBoxes);
    otpInput.addEventListener("blur", () => {
        otpBoxes.forEach((box) => box.classList.remove("focused"));
    });

    // Clicking anywhere on the box row focuses the input
    const boxesContainer = document.querySelector(".otp-boxes");
    if (boxesContainer) {
        boxesContainer.addEventListener("click", () => {
            otpInput.focus();
        });
    }

    // Initial render of empty boxes
    updateOtpBoxes();

    // -------------------------------------------------------------
    // Form Submission / OTP Verification
    // -------------------------------------------------------------
    verifyForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        alertContainer.replaceChildren();
        const otpCode = otpInput.value.trim();

        // Validate exactly 6 digits - field validation stays inline
        if (!/^\d{6}$/.test(otpCode)) {
            showAlert(alertContainer, "Enter the 6-digit code sent to your email.", "danger");
            otpInput.focus();
            return;
        }

        isSubmitting = true;
        setButtonLoading(submitBtn, true, "Verifying...");

        try {
            const response = await apiRequest("/api/voter/auth/verify-otp", {
                method: "POST",
                body: {
                    admissionNumber: pendingAdmission.trim(),
                    otpCode
                }
            });

            if (response.ok && response.status === 200) {
                // Success: Part C item 1 - save token to localStorage under udus_voting_token
                if (response.data && response.data.votingToken) {
                    setVotingToken(response.data.votingToken);
                }

                // Redirect to ballot.html upon successful verification
                window.location.href = "ballot.html";
                return;
            }

            // Error handling matching Part B specification with Pop-ups
            if (response.status === 401) {
                // 401 -> error, "Invalid code", "The code you entered is not correct. Check it and try again." [Try again: close and focus code input]
                window.UdusPopup.show({
                    type: "error",
                    icon: "error",
                    title: "Invalid code",
                    message: "The code you entered is not correct. Check it and try again.",
                    primary: {
                        label: "Try again",
                        onClick: () => {
                            window.UdusPopup.close();
                            otpInput.value = "";
                            updateOtpBoxes();
                            otpInput.focus();
                        }
                    },
                    dismissible: true
                });
            } else if (response.status === 410) {
                // 410 -> clock, "Code expired", "Your code has expired. Request a new one." [Request a new code]
                window.UdusPopup.show({
                    type: "warning",
                    icon: "clock",
                    title: "Code expired",
                    message: "Your code has expired. Request a new one.",
                    primary: {
                        label: "Request a new code",
                        onClick: () => {
                            window.UdusPopup.close();
                            handleResendOtp();
                        }
                    },
                    dismissible: true
                });
            } else if (response.status === 409) {
                const rawMsg = (response.data && response.data.message) || "";
                const isNotOpen = /not open/i.test(rawMsg);

                if (isNotOpen) {
                    // 409 "not open" as in login
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
                } else {
                    // 409 "ballot already issued" -> warning, "Ballot already issued", backend message
                    // Add primary button "Check my vote" only if stored token exists on this device
                    const safeMsg = window.UdusPopup.safeMessage(response.status, rawMsg, "A ballot has already been issued for this admission number in this session.");
                    const tokenExists = hasVotingToken();

                    if (tokenExists) {
                        window.UdusPopup.show({
                            type: "warning",
                            icon: "warning",
                            title: "Ballot already issued",
                            message: safeMsg,
                            primary: {
                                label: "Check my vote",
                                onClick: () => {
                                    window.UdusPopup.close();
                                    runCheckMyVote();
                                }
                            },
                            secondary: {
                                label: "OK",
                                onClick: () => window.UdusPopup.close()
                            },
                            dismissible: true
                        });
                    } else {
                        const fullMsg = safeMsg + " If you did not finish voting, contact the SUG ICT Team.";
                        window.UdusPopup.show({
                            type: "warning",
                            icon: "warning",
                            title: "Ballot already issued",
                            message: fullMsg,
                            primary: {
                                label: "OK",
                                onClick: () => window.UdusPopup.close()
                            },
                            dismissible: true
                        });
                    }
                }
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
                const safeMsg = window.UdusPopup.safeMessage(response.status, rawMsg, "Unable to verify code. Please try again.");
                window.UdusPopup.show({
                    type: "error",
                    icon: "error",
                    title: "Unable to verify code",
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

    // -------------------------------------------------------------
    // Countdown Timer & Resend Code
    // -------------------------------------------------------------
    const INITIAL_COUNTDOWN_SECONDS = 165; // 02:45
    let secondsLeft = INITIAL_COUNTDOWN_SECONDS;
    let timerInterval = null;

    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function renderTimerState() {
        if (!resendWrapper) return;
        resendWrapper.replaceChildren();

        if (secondsLeft > 0) {
            const clockSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            clockSvg.setAttribute("class", "resend-clock-icon");
            clockSvg.setAttribute("viewBox", "0 0 24 24");
            clockSvg.setAttribute("width", "18");
            clockSvg.setAttribute("height", "18");
            clockSvg.setAttribute("fill", "none");
            clockSvg.setAttribute("stroke", "currentColor");
            clockSvg.setAttribute("stroke-width", "2.2");
            clockSvg.setAttribute("stroke-linecap", "round");
            clockSvg.setAttribute("stroke-linejoin", "round");
            clockSvg.setAttribute("aria-hidden", "true");

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", "12");
            circle.setAttribute("cy", "12");
            circle.setAttribute("r", "10");

            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyline.setAttribute("points", "12 6 12 12 16 14");

            clockSvg.appendChild(circle);
            clockSvg.appendChild(polyline);

            const span = document.createElement("span");
            span.appendChild(document.createTextNode("Resend code in "));
            const strong = document.createElement("strong");
            strong.id = "countdownTimer";
            strong.className = "resend-timer-bold";
            strong.textContent = formatTime(secondsLeft);
            span.appendChild(strong);

            resendWrapper.appendChild(clockSvg);
            resendWrapper.appendChild(span);
        } else {
            const resendBtn = document.createElement("button");
            resendBtn.type = "button";
            resendBtn.className = "btn-resend-link";
            resendBtn.id = "resendCodeBtn";
            resendBtn.textContent = "Resend code";
            resendBtn.addEventListener("click", handleResendOtp);
            resendWrapper.appendChild(resendBtn);
        }
    }

    function startCountdown() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        renderTimerState();

        timerInterval = setInterval(() => {
            secondsLeft--;
            renderTimerState();
            if (secondsLeft <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }, 1000);
    }

    async function handleResendOtp() {
        const resendBtn = document.getElementById("resendCodeBtn");
        if (resendBtn) {
            resendBtn.disabled = true;
            resendBtn.textContent = "Sending...";
        }

        try {
            const response = await apiRequest("/api/voter/auth/login", {
                method: "POST",
                body: {
                    admissionNumber: pendingAdmission.trim()
                }
            });

            if (response.ok && response.status === 200) {
                showAlert(alertContainer, "A new 6-digit code has been sent to your email.", "info");
                otpInput.value = "";
                updateOtpBoxes();
                secondsLeft = INITIAL_COUNTDOWN_SECONDS;
                startCountdown();
            } else if (response.status === 409) {
                const rawMsg = (response.data && response.data.message) || "";
                const safeMsg = window.UdusPopup.safeMessage(response.status, rawMsg, "Voting is not open right now.");
                window.UdusPopup.show({
                    type: "error",
                    icon: "no-entry",
                    title: "Voting is not open",
                    message: safeMsg,
                    secondary: { label: "Back to Home", href: "index.html" },
                    primary: { label: "OK", onClick: () => window.UdusPopup.close() },
                    dismissible: true
                });
            } else if (response.status === 0 || response.status >= 500) {
                window.UdusPopup.show({
                    type: "error",
                    icon: "offline",
                    title: "Connection problem",
                    message: "We could not reach the server. Check your internet connection and try again.",
                    primary: { label: "Try again", onClick: () => window.UdusPopup.close() },
                    dismissible: true
                });
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = "Resend code";
                }
            } else {
                const rawMsg = (response.data && response.data.message) || "";
                const safeMsg = window.UdusPopup.safeMessage(response.status, rawMsg, "Unable to resend code. Please try again.");
                showAlert(alertContainer, safeMsg, "danger");
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = "Resend code";
                }
            }
        } catch {
            window.UdusPopup.show({
                type: "error",
                icon: "offline",
                title: "Connection problem",
                message: "We could not reach the server. Check your internet connection and try again.",
                primary: { label: "Try again", onClick: () => window.UdusPopup.close() },
                dismissible: true
            });
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.textContent = "Resend code";
            }
        }
    }

    // Start initial countdown
    startCountdown();
});
