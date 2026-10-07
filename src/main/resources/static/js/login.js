/**
 * UDUS SUG Blockchain Voting System - Voter Login (V1)
 *
 * Handles voter authentication initiation:
 * - Validates admission number input
 * - Submits to POST /api/voter/auth/login
 * - Sets pendingAdmission in sessionStorage on HTTP 200 and redirects to verify.html
 * - Displays appropriate error alerts for 401, 404, and other statuses
 */

import { apiRequest } from "./api.js";
import { showAlert, setButtonLoading } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const admissionInput = document.getElementById("admissionNumber");
    const submitBtn = document.getElementById("loginSubmitBtn");
    const alertContainer = document.getElementById("alert-container");

    if (!loginForm || !admissionInput || !submitBtn || !alertContainer) {
        return;
    }

    let isSubmitting = false;

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        // Clear previous alerts
        alertContainer.innerHTML = "";

        const admissionNumber = admissionInput.value.trim();

        // Client-side empty check
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

            // Error handling matching specification
            if (response.status === 401) {
                showAlert(alertContainer, "This admission number is not eligible to vote.", "danger");
            } else if (response.status === 404) {
                showAlert(alertContainer, "Admission number not found.", "danger");
            } else {
                let errorMessage = "Unable to continue. Please try again.";
                if (response.data && typeof response.data === "object" && response.data.message) {
                    errorMessage = response.data.message;
                } else if (typeof response.data === "string" && response.data.trim()) {
                    errorMessage = response.data;
                }
                showAlert(alertContainer, errorMessage, "danger");
            }
        } catch {
            showAlert(alertContainer, "Unable to continue. Please try again.", "danger");
        } finally {
            isSubmitting = false;
            setButtonLoading(submitBtn, false);
        }
    });
});
