import { API_BASE } from "./config.js";

/**
 * Shared API request helper communicating with the Spring Boot backend.
 *
 * @param {string} path - Target API endpoint path (e.g. '/api/admin/login')
 * @param {Object} [options={}] - Fetch configuration options
 * @param {boolean} [options.adminAuth=false] - Whether to attach the admin Bearer token
 * @returns {Promise<{ok: boolean, status: number, data: any}>}
 */
export async function apiRequest(path, options = {}) {
    try {
        const url = `${API_BASE}${path}`;
        const headers = { ...(options.headers || {}) };
        let body = options.body;

        if (body !== undefined && body !== null) {
            if (typeof body === "object") {
                body = JSON.stringify(body);
            }
            if (!headers["Content-Type"] && !headers["content-type"]) {
                headers["Content-Type"] = "application/json";
            }
        }

        if (options.adminAuth) {
            const token = sessionStorage.getItem("adminToken");
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
        }

        const fetchOptions = {
            ...options,
            headers,
            body
        };
        delete fetchOptions.adminAuth;

        const response = await fetch(url, fetchOptions);
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            data: null
        };
    }
}