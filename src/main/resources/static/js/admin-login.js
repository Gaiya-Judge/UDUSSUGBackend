/**
 * UDUS SUG Blockchain Voting System - Admin Authentication
 *
 * Handles administrator login:
 * - Validates username/email and password inputs (inline field errors)
 * - Toggles password field visibility
 * - Submits payload { email, password } to POST /api/admin/auth/login
 * - Stores bearer token and session metadata in sessionStorage upon HTTP 200
 * - Redirects to admin dashboard
 * - Displays Pop-ups for 401 (Incorrect email or password), 423 (Account locked), and network/5xx
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

            passwordToggleBtn.replaceChildren();

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("width", "18");
            svg.setAttribute("height", "18");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.setAttribute("aria-hidden", "true");

            if (isPassword) {
                // Eye Off icon
                const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                p1.setAttribute("d", "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24");
                const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
                l1.setAttribute("x1", "1");
                l1.setAttribute("y1", "1");
                l1.setAttribute("x2", "23");
                l1.setAttribute("y2", "23");
                svg.appendChild(p1);
                svg.appendChild(l1);
            } else {
                // Eye Open icon
                const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                p1.setAttribute("d", "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z");
                const c1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                c1.setAttribute("cx", "12");
                c1.setAttribute("cy", "12");
                c1.setAttribute("r", "3");
                svg.appendChild(p1);
                svg.appendChild(c1);
            }

            passwordToggleBtn.appendChild(svg);
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

        alertContainer.replaceChildren();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Field validation stays inline next to field
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
                // Store authentication token in sessionStorage
                const { token, tokenType = "Bearer", expiresInMs, email: adminEmail } = response.data;
                sessionStorage.setItem("adminToken", token);
                sessionStorage.setItem("adminTokenType", tokenType);
                const finalEmail = adminEmail || email;
                if (finalEmail) {
                    sessionStorage.setItem("adminEmail", finalEmail);
                }
                if (expiresInMs) {
                    sessionStorage.setItem("adminExpiresInMs", String(expiresInMs));
                    sessionStorage.setItem("adminTokenExpiresAt", String(Date.now() + Number(expiresInMs)));
                }

                // Redirect to admin dashboard
                window.location.href = "admin-dashboard.html";
                return;
            }

            // Error handling matching Part B specification with Pop-ups
            if (response.status === 401) {
                // 401 -> error, "Incorrect email or password" [Try again]
                window.UdusPopup.show({
                    type: "error",
                    icon: "error",
                    title: "Incorrect email or password",
                    message: "Invalid email/username or password. Please verify your credentials and try again.",
                    primary: {
                        label: "Try again",
                        onClick: () => {
                            window.UdusPopup.close();
                            passwordInput.value = "";
                            passwordInput.focus();
                        }
                    },
                    dismissible: true
                });
            } else if (response.status === 423) {
                // 423 -> lock, "Account locked", backend message [OK]
                const rawMsg = (response.data && response.data.message) || "";
                const safeMsg = window.UdusPopup.safeMessage(response.status, rawMsg, "This account has been locked due to consecutive failed login attempts. Please try again in 15 minutes or contact system support.");
                window.UdusPopup.show({
                    type: "error",
                    icon: "lock",
                    title: "Account locked",
                    message: safeMsg,
                    primary: {
                        label: "OK",
                        onClick: () => window.UdusPopup.close()
                    },
                    dismissible: true
                });
            } else if (response.status === 0 || response.status >= 500) {
                // Network or 5xx -> offline, "Connection problem"
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
                const safeMsg = window.UdusPopup.safeMessage(response.status, rawMsg, "An error occurred during login. Please try again.");
                window.UdusPopup.show({
                    type: "error",
                    icon: "error",
                    title: "Login failed",
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
