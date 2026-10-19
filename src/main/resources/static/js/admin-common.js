/**
 * UDUS SUG Blockchain Voting System - Admin Common Utilities & Auth Foundation
 * 
 * Shared foundation for all administrator pages:
 * - Auth guard: checks sessionStorage for adminToken, redirects to admin-login.html if absent or expired
 * - apiFetch helper: attaches Authorization: Bearer token, handles 401 by clearing auth and redirecting
 * - logout helper: cleans session and redirects to admin-login.html
 * - Admin header initialization (email display, logout button binding)
 * - Sidebar active-state navigation handler
 */

import { API_BASE } from "./config.js";

/**
 * Check if the current user is authenticated as an admin.
 * If not, redirects immediately to admin-login.html.
 */
export function checkAuthGuard() {
    const token = sessionStorage.getItem("adminToken");
    const expiresAt = sessionStorage.getItem("adminTokenExpiresAt");

    if (!token) {
        window.location.replace("admin-login.html");
        return false;
    }

    if (expiresAt && Number(expiresAt) <= Date.now()) {
        clearAdminSession();
        window.location.replace("admin-login.html");
        return false;
    }

    return true;
}

/**
 * Clear all admin authentication credentials and session flags.
 */
export function clearAdminSession() {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminTokenType");
    sessionStorage.removeItem("adminEmail");
    sessionStorage.removeItem("adminExpiresInMs");
    sessionStorage.removeItem("adminTokenExpiresAt");
}

/**
 * Log out the administrator, clearing auth data and redirecting to login.
 */
export function logout() {
    clearAdminSession();
    window.location.href = "admin-login.html";
}

/**
 * Authenticated API fetch helper.
 * Attaches Bearer token in Authorization header.
 * Automatically clears session and redirects to admin-login.html on HTTP 401.
 * 
 * @param {string} path - API endpoint path (e.g. '/api/admin/dashboard')
 * @param {RequestInit} [options={}] - Fetch configuration options
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiFetch(path, options = {}) {
    const token = sessionStorage.getItem("adminToken");
    if (!token) {
        clearAdminSession();
        window.location.replace("admin-login.html");
        throw new Error("Unauthenticated: No admin token found.");
    }

    const url = `${API_BASE}${path}`;
    const headers = new Headers(options.headers || {});

    // Attach Bearer token
    headers.set("Authorization", `Bearer ${token}`);

    let body = options.body;
    if (body !== undefined && body !== null && typeof body === "object" && !(body instanceof FormData)) {
        body = JSON.stringify(body);
        if (!headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }
    }

    const fetchConfig = {
        ...options,
        headers,
        body
    };

    try {
        const response = await fetch(url, fetchConfig);

        if (response.status === 401) {
            clearAdminSession();
            if (window.UdusPopup) {
                window.UdusPopup.show({
                    type: "warning",
                    icon: "clock",
                    title: "Session expired",
                    message: "Please log in again.",
                    primary: {
                        label: "Log in",
                        href: "admin-login.html"
                    },
                    dismissible: false
                });
            } else {
                window.location.replace("admin-login.html");
            }
            return {
                ok: false,
                status: 401,
                data: { message: "Session expired. Please log in again." }
            };
        }

        if (response.status === 403) {
            if (window.UdusPopup) {
                window.UdusPopup.show({
                    type: "error",
                    icon: "lock",
                    title: "Access denied",
                    message: "You do not have permission to do this.",
                    primary: {
                        label: "Back to Login",
                        href: "admin-login.html"
                    },
                    dismissible: true
                });
            }
            return {
                ok: false,
                status: 403,
                data: { message: "Access denied. You do not have permission to do this." }
            };
        }

        const text = await response.text();
        let data = null;
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
        }

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (networkError) {
        return {
            ok: false,
            status: 0,
            data: { message: networkError.message || "Network unreachable" }
        };
    }
}

/**
 * Initialize admin shell elements:
 * - Display admin email in header
 * - Attach logout event listeners
 * - Highlight active sidebar item
 */
export function initAdminShell() {
    // 1. Display admin email
    const email = sessionStorage.getItem("adminEmail") || "admin@udusug.edu.ng";
    document.querySelectorAll(".js-admin-email").forEach(el => {
        el.textContent = email;
    });

    // 2. Attach logout handlers
    document.querySelectorAll(".js-admin-logout").forEach(el => {
        el.addEventListener("click", (e) => {
            e.preventDefault();
            logout();
        });
    });

    // 3. Highlight active sidebar item
    const currentPath = window.location.pathname;
    const pageFilename = currentPath.substring(currentPath.lastIndexOf("/") + 1) || "admin-dashboard.html";

    document.querySelectorAll(".admin-nav-item").forEach(link => {
        const href = link.getAttribute("href");
        if (href && (href === pageFilename || (pageFilename === "" && href === "admin-dashboard.html"))) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        } else if (href && href !== "#") {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
        }
    });
}

// Auto-run auth guard immediately when script is imported
checkAuthGuard();

document.addEventListener("DOMContentLoaded", () => {
    initAdminShell();
});
