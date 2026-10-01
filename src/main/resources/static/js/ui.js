/**
 * Shared UI helpers for the UDUS SUG Voting System frontend.
 */

/**
 * Display a Bootstrap alert inside the specified container.
 *
 * @param {HTMLElement|string} container - Target container element or CSS selector
 * @param {string|Node} message - Alert message text or DOM node
 * @param {('success'|'danger'|'warning'|'info')} [type='info'] - Bootstrap alert type
 */
export function showAlert(container, message, type = "info") {
    const target = typeof container === "string" ? document.querySelector(container) : container;
    if (!target) return;

    const validTypes = ["success", "danger", "warning", "info"];
    const alertType = validTypes.includes(type) ? type : "info";

    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${alertType} alert-dismissible fade show`;
    alertDiv.setAttribute("role", "alert");

    const messageSpan = document.createElement("span");
    if (message instanceof Node) {
        messageSpan.appendChild(message);
    } else {
        messageSpan.textContent = String(message ?? "");
    }
    alertDiv.appendChild(messageSpan);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "btn-close";
    closeBtn.setAttribute("data-bs-dismiss", "alert");
    closeBtn.setAttribute("aria-label", "Close");
    alertDiv.appendChild(closeBtn);

    target.innerHTML = "";
    target.appendChild(alertDiv);
}

/**
 * Toggle button loading state, showing a spinner and preserving original content.
 *
 * @param {HTMLElement|string} button - Button element or CSS selector
 * @param {boolean} loading - True to show loading state, false to restore
 * @param {string} [loadingText="Please wait..."] - Label shown during loading
 */
export function setButtonLoading(button, loading, loadingText = "Please wait...") {
    const btn = typeof button === "string" ? document.querySelector(button) : button;
    if (!btn) return;

    if (loading) {
        if (btn.dataset.originalHtml === undefined) {
            btn.dataset.originalHtml = btn.innerHTML;
        }
        btn.disabled = true;

        const spinner = document.createElement("span");
        spinner.className = "spinner-border spinner-border-sm me-2";
        spinner.setAttribute("role", "status");
        spinner.setAttribute("aria-hidden", "true");

        btn.innerHTML = "";
        btn.appendChild(spinner);
        btn.appendChild(document.createTextNode(loadingText));
    } else {
        if (btn.dataset.originalHtml !== undefined) {
            btn.innerHTML = btn.dataset.originalHtml;
            delete btn.dataset.originalHtml;
        }
        btn.disabled = false;
    }
}

/**
 * Format backend date/time strings for human-readable Nigerian/WAT display.
 * Example output: "1 Oct 2026, 9:00 AM"
 *
 * If the input has no timezone offset (e.g., LocalDateTime "2026-09-30T12:15:00"),
 * it is treated as WAT (UTC+1) for display only.
 *
 * @param {string|number|Date} value - Date value to format
 * @returns {string} Human-readable formatted date string
 */
export function formatDateTime(value) {
    if (!value) return "";

    let str = typeof value === "string" ? value.trim() : value;
    if (typeof str === "string") {
        // If ISO-like string without timezone offset, treat as WAT (+01:00)
        if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str)) {
            str = str.replace(" ", "T") + "+01:00";
        }
    }

    const date = new Date(str);
    if (isNaN(date.getTime())) {
        return String(value);
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Lagos",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });

    const parts = formatter.formatToParts(date);
    const map = {};
    for (const part of parts) {
        map[part.type] = part.value;
    }

    const day = map.day || "";
    const month = map.month || "";
    const year = map.year || "";
    const hour = map.hour || "";
    const minute = map.minute || "";
    const period = (map.dayPeriod || "").toUpperCase();

    return `${day} ${month} ${year}, ${hour}:${minute} ${period}`.trim();
}