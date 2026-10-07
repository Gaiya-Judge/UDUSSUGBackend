/**
 * UDUS SUG Blockchain Voting System - Voter OTP Verification (V2)
 *
 * Handles voter identity verification via one-time code:
 * - Guards page: redirects to index.html if sessionStorage.pendingAdmission is missing
 * - Segmented 6-digit numeric input with non-digit stripping
 * - Submits to POST /api/voter/auth/verify-otp
 * - Stores votingToken on HTTP 200 and redirects to ballot.html
 * - Manages 02:45 countdown and resend OTP action
 */

import { apiRequest } from "./api.js";
import { showAlert, setButtonLoading } from "./ui.js";

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

        alertContainer.innerHTML = "";
        const otpCode = otpInput.value.trim();

        // Validate exactly 6 digits
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
                if (response.data && response.data.votingToken) {
                    sessionStorage.setItem("votingToken", response.data.votingToken);
                }
                if (response.data && response.data.expiresAt) {
                    sessionStorage.setItem("votingTokenExpiresAt", response.data.expiresAt);
                }

                // Redirect to ballot.html upon successful verification
                window.location.href = "ballot.html";
                return;
            }

            // Error handling matching backend status codes
            if (response.status === 401) {
                const message = (response.data && response.data.message) || "Invalid OTP code. Please check and try again.";
                showAlert(alertContainer, message, "danger");
            } else if (response.status === 409) {
                const message = (response.data && response.data.message) || "OTP code has already been used.";
                showAlert(alertContainer, message, "danger");
            } else if (response.status === 410) {
                const message = (response.data && response.data.message) || "OTP code has expired. Please request a new one.";
                showAlert(alertContainer, message, "danger");
            } else {
                let message = "Unable to verify code. Please try again.";
                if (response.data && typeof response.data === "object" && response.data.message) {
                    message = response.data.message;
                } else if (typeof response.data === "string" && response.data.trim()) {
                    message = response.data;
                }
                showAlert(alertContainer, message, "danger");
            }
        } catch {
            showAlert(alertContainer, "Unable to verify code. Please try again.", "danger");
        } finally {
            isSubmitting = false;
            setButtonLoading(submitBtn, false);
        }
    });

    // -------------------------------------------------------------
    // Countdown Timer & Resend Code
    // -------------------------------------------------------------
    const INITIAL_COUNTDOWN_SECONDS = 165; // 02:45 as shown in screenshot
    let secondsLeft = INITIAL_COUNTDOWN_SECONDS;
    let timerInterval = null;

    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    function renderTimerState() {
        if (!resendWrapper) return;

        if (secondsLeft > 0) {
            resendWrapper.innerHTML = `
                <svg class="resend-clock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Resend code in <strong class="resend-timer-bold">${formatTime(secondsLeft)}</strong></span>
            `;
        } else {
            resendWrapper.innerHTML = `
                <button type="button" class="btn-resend-link" id="resendCodeBtn">Resend code</button>
            `;

            const resendBtn = document.getElementById("resendCodeBtn");
            if (resendBtn) {
                resendBtn.addEventListener("click", handleResendOtp);
            }
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
            } else {
                let message = "Unable to resend code. Please try again.";
                if (response.data && typeof response.data === "object" && response.data.message) {
                    message = response.data.message;
                }
                showAlert(alertContainer, message, "danger");
                if (resendBtn) {
                    resendBtn.disabled = false;
                    resendBtn.textContent = "Resend code";
                }
            }
        } catch {
            showAlert(alertContainer, "Unable to resend code. Please try again.", "danger");
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.textContent = "Resend code";
            }
        }
    }

    // Start initial countdown
    startCountdown();
});
