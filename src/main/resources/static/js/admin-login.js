/**
 * UDUS SUG Blockchain Voting System - Admin Authentication
 *
 * Handles administrator login:
 * - Validates username/email and password inputs
 * - Toggles password field visibility (type="password" / type="text")
 * - Submits payload { email, password } to POST /api/admin/auth/login
 * - Stores bearer token and session metadata in sessionStorage upon HTTP 200
 * - Redirects to admin dashboard
 * - Displays clear, distinct inline error messages for 401 (invalid credentials)
 *   and 423 (account locked)
 */

import { apiRequest } from "./api.js";
import { showAlert, setButtonLoading } from "./ui.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("adminLoginForm");
    const emailInput = document.getElementById("adminEmail");
    const passwordInput = document.getElementById("adminPassword");
    const submitBtn = document.getElementById("adminLoginSubmitBtn");
    const alertContainer = document.getElementById("alertContainer");
    const passwordToggleBtn = document.getElementById("passwordToggleBtn");

    if (!loginForm || !emailInput || !passwordInput || !submitBtn || !alertContainer) {
        return;
    }

    // -------------------------------------------------------------
    // Password Show / Hide Visibility Toggle
    // -------------------------------------------------------------
    if (passwordToggleBtn) {
        passwordToggleBtn.addEventListener("click", () => {
            const isPassword = passwordInput.getAttribute("type") === "password";
            const newType = isPassword ? "text" : "password";
            passwordInput.setAttribute("type", newType);

            passwordToggleBtn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
            passwordToggleBtn.setAttribute("aria-pressed", isPassword ? "true" : "false");

            // Update eye icon SVG
            if (isPassword) {
                // Eye Off (slashed) icon
                passwordToggleBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                `;
            } else {
                // Eye Open icon
                passwordToggleBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                `;
            }
        });
    }

    // -------------------------------------------------------------
    // Form Submission Handler
    // -------------------------------------------------------------
    let isSubmitting = false;

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        // Clear previous alerts
        alertContainer.innerHTML = "";

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Client-side empty validation
        if (!email) {
            showAlert(alertContainer, "Please enter your username or email address.", "danger");
            emailInput.focus();
            return;
        }

        if (!password) {
            showAlert(alertContainer, "Please enter your password.", "danger");
            passwordInput.focus();
            return;
        }

        isSubmitting = true;
        setButtonLoading(submitBtn, true, "Signing in...");

        try {
            const response = await apiRequest("/api/admin/auth/login", {
                method: "POST",
                body: {
                    email,
                    password
                }
            });

            if (response.ok && response.status === 200 && response.data) {
                // 1. Store authentication token in sessionStorage (matching project pattern)
                const { token, tokenType = "Bearer", expiresInMs, email: adminEmail } = response.data;
                sessionStorage.setItem("adminToken", token);
                sessionStorage.setItem("adminTokenType", tokenType);
                if (adminEmail) {
                    sessionStorage.setItem("adminEmail", adminEmail);
                }
                if (expiresInMs) {
                    sessionStorage.setItem("adminExpiresInMs", String(expiresInMs));
                    sessionStorage.setItem("adminTokenExpiresAt", String(Date.now() + Number(expiresInMs)));
                }

                // 2. Redirect to admin dashboard
                window.location.href = "admin/dashboard.html";
                return;
            }

            // ---------------------------------------------------------
            // Error Handling: Distinct inline messages
            // ---------------------------------------------------------
            if (response.status === 401) {
                // Invalid credentials
                const msg = (response.data && response.data.message)
                    ? response.data.message
                    : "Invalid email/username or password. Please verify your credentials and try again.";
                showAlert(alertContainer, msg, "danger");
                passwordInput.value = "";
                passwordInput.focus();
            } else if (response.status === 423) {
                // Account locked
                const lockMsg = (response.data && response.data.message)
                    ? response.data.message
                    : "This account has been locked due to consecutive failed login attempts. Please try again in 15 minutes or contact system support.";
                showAlert(alertContainer, lockMsg, "danger");
            } else if (response.status === 400) {
                // Validation error (e.g. invalid email format)
                let errorText = "Please provide a valid email address.";
                if (response.data && response.data.validationErrors && response.data.validationErrors.email) {
                    errorText = response.data.validationErrors.email;
                } else if (response.data && response.data.message) {
                    errorText = response.data.message;
                }
                showAlert(alertContainer, errorText, "danger");
            } else if (response.status === 0) {
                // Network unreachable
                showAlert(alertContainer, "Unable to reach the authentication server. Please check your connection and try again.", "danger");
            } else {
                // Other server errors
                let errorText = "An error occurred during login. Please try again.";
                if (response.data && typeof response.data === "object" && response.data.message) {
                    errorText = response.data.message;
                }
                showAlert(alertContainer, errorText, "danger");
            }
        } catch (error) {
            showAlert(alertContainer, "An unexpected error occurred. Please try again.", "danger");
        } finally {
            isSubmitting = false;
            setButtonLoading(submitBtn, false);
        }
    });
});
