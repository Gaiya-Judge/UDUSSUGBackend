/**
 * UDUS SUG Blockchain Voting System - Reusable Pop-up Component (Part A)
 * 
 * Standalone accessible modal dialog (Z-Index 2000, no Bootstrap JS dependency).
 * Renders all text content safely with textContent, never innerHTML.
 */

(function () {
    let currentOverlay = null;
    let previousActiveElement = null;
    let keydownListener = null;

    // SVG icon templates
    const ICONS = {
        error: function () {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2.8");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.classList.add("udus-popup-icon-svg");

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", "12");
            circle.setAttribute("cy", "12");
            circle.setAttribute("r", "10");

            const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line1.setAttribute("x1", "12");
            line1.setAttribute("y1", "8");
            line1.setAttribute("x2", "12");
            line1.setAttribute("y2", "12");

            const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line2.setAttribute("x1", "12");
            line2.setAttribute("y1", "16");
            line2.setAttribute("x2", "12.01");
            line2.setAttribute("y2", "16");

            svg.appendChild(circle);
            svg.appendChild(line1);
            svg.appendChild(line2);
            return svg;
        },

        warning: function () {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2.8");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.classList.add("udus-popup-icon-svg");

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z");

            const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line1.setAttribute("x1", "12");
            line1.setAttribute("y1", "9");
            line1.setAttribute("x2", "12");
            line1.setAttribute("y2", "13");

            const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line2.setAttribute("x1", "12");
            line2.setAttribute("y1", "17");
            line2.setAttribute("x2", "12.01");
            line2.setAttribute("y2", "17");

            svg.appendChild(path);
            svg.appendChild(line1);
            svg.appendChild(line2);
            return svg;
        },

        info: function () {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2.8");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.classList.add("udus-popup-icon-svg");

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", "12");
            circle.setAttribute("cy", "12");
            circle.setAttribute("r", "10");

            const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line1.setAttribute("x1", "12");
            line1.setAttribute("y1", "16");
            line1.setAttribute("x2", "12");
            line1.setAttribute("y2", "12");

            const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line2.setAttribute("x1", "12");
            line2.setAttribute("y1", "8");
            line2.setAttribute("x2", "12.01");
            line2.setAttribute("y2", "8");

            svg.appendChild(circle);
            svg.appendChild(line1);
            svg.appendChild(line2);
            return svg;
        },

        lock: function () {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2.5");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.classList.add("udus-popup-icon-svg");

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", "3");
            rect.setAttribute("y", "11");
            rect.setAttribute("width", "18");
            rect.setAttribute("height", "11");
            rect.setAttribute("rx", "2");
            rect.setAttribute("ry", "2");

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", "M7 11V7a5 5 0 0 1 10 0v4");

            svg.appendChild(rect);
            svg.appendChild(path);
            return svg;
        },

        clock: function () {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2.5");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.classList.add("udus-popup-icon-svg");

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", "12");
            circle.setAttribute("cy", "12");
            circle.setAttribute("r", "10");

            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyline.setAttribute("points", "12 6 12 12 16 14");

            svg.appendChild(circle);
            svg.appendChild(polyline);
            return svg;
        },

        "no-entry": function () {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2.8");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.classList.add("udus-popup-icon-svg");

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", "12");
            circle.setAttribute("cy", "12");
            circle.setAttribute("r", "10");

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", "4.93");
            line.setAttribute("y1", "4.93");
            line.setAttribute("x2", "19.07");
            line.setAttribute("y2", "19.07");

            svg.appendChild(circle);
            svg.appendChild(line);
            return svg;
        },

        offline: function () {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2.5");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.classList.add("udus-popup-icon-svg");

            const slash = document.createElementNS("http://www.w3.org/2000/svg", "line");
            slash.setAttribute("x1", "1");
            slash.setAttribute("y1", "1");
            slash.setAttribute("x2", "23");
            slash.setAttribute("y2", "23");

            const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p1.setAttribute("d", "M16.72 11.06A10.94 10.94 0 0 1 19 12.55");

            const p2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p2.setAttribute("d", "M5 12.55a10.94 10.94 0 0 1 5.17-2.39");

            const p3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p3.setAttribute("d", "M10.71 5.05A16 16 0 0 1 22.58 9");

            const p4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
            p4.setAttribute("d", "M1.42 9a15.91 15.91 0 0 1 4.7-2.88");

            const dot = document.createElementNS("http://www.w3.org/2000/svg", "line");
            dot.setAttribute("x1", "12");
            dot.setAttribute("y1", "20");
            dot.setAttribute("x2", "12.01");
            dot.setAttribute("y2", "20");

            svg.appendChild(slash);
            svg.appendChild(p1);
            svg.appendChild(p2);
            svg.appendChild(p3);
            svg.appendChild(p4);
            svg.appendChild(dot);
            return svg;
        },

        check: function () {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "3.2");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");
            svg.classList.add("udus-popup-icon-svg");

            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyline.setAttribute("points", "20 6 9 17 4 12");

            svg.appendChild(polyline);
            return svg;
        }
    };

    /**
     * Inspect backend message for safety.
     * Only allow clean 4xx business messages through.
     * Rejects anything containing "0x", "transaction", > 200 chars, tokens, stack traces.
     */
    function isSafeMessage(msg) {
        if (!msg || typeof msg !== "string") return false;
        const text = msg.trim();
        if (text.length === 0 || text.length > 200) return false;
        if (text.includes("0x") || /transaction/i.test(text)) return false;
        if (/exception|stacktrace|token|hash|sql|error code|trace/i.test(text)) return false;
        return true;
    }

    /**
     * Return safe message string for display.
     */
    function safeMessage(status, rawMessage, fallback) {
        if (typeof status === "number" && status >= 400 && status < 500) {
            if (isSafeMessage(rawMessage)) {
                return rawMessage.trim();
            }
        }
        return fallback;
    }

    /**
     * Close currently open pop-up.
     */
    function closePopup() {
        if (!currentOverlay) return;

        if (keydownListener) {
            document.removeEventListener("keydown", keydownListener);
            keydownListener = null;
        }

        document.body.style.overflow = "";

        if (currentOverlay.parentNode) {
            currentOverlay.parentNode.removeChild(currentOverlay);
        }
        currentOverlay = null;

        // Restore focus to element that triggered the dialog
        if (previousActiveElement && typeof previousActiveElement.focus === "function") {
            try {
                previousActiveElement.focus();
            } catch {
                // Ignore if element is detached
            }
        }
        previousActiveElement = null;
    }

    /**
     * Show modal pop-up.
     * 
     * @param {Object} options
     * @param {'error'|'warning'|'info'|'success'} [options.type='error']
     * @param {'error'|'warning'|'info'|'lock'|'clock'|'no-entry'|'offline'|'check'} [options.icon='error']
     * @param {string} options.title
     * @param {string} options.message
     * @param {Object} [options.primary] - { label: string, onClick?: Function, href?: string }
     * @param {Object} [options.secondary] - { label: string, onClick?: Function, href?: string }
     * @param {boolean} [options.dismissible=true]
     */
    function showPopup(options) {
        if (!options) return;

        // One pop-up at a time: close existing first
        closePopup();

        previousActiveElement = document.activeElement;

        const type = options.type || "error";
        const iconKey = options.icon || (type === "success" ? "check" : (type === "warning" ? "warning" : "error"));
        const titleText = options.title || "";
        const messageText = options.message || "";
        const dismissible = options.dismissible !== false; // default true

        // Create overlay container
        const overlay = document.createElement("div");
        overlay.className = "udus-popup-overlay";
        overlay.setAttribute("role", "presentation");

        // Create card
        const card = document.createElement("div");
        card.className = `udus-popup-card udus-popup-type-${type}`;
        card.setAttribute("role", "alertdialog");
        card.setAttribute("aria-modal", "true");
        card.setAttribute("aria-labelledby", "udus-popup-title");
        card.setAttribute("aria-describedby", "udus-popup-message");
        card.tabIndex = -1;

        // 1. Concentric Icon Ring (matching receipt.html badge ring)
        const badgeRing = document.createElement("div");
        badgeRing.className = "udus-popup-badge-ring";
        badgeRing.setAttribute("aria-hidden", "true");

        const badgeInner = document.createElement("div");
        badgeInner.className = "udus-popup-badge-inner";

        const iconBuilder = ICONS[iconKey] || ICONS.error;
        const iconSvg = iconBuilder();
        badgeInner.appendChild(iconSvg);
        badgeRing.appendChild(badgeInner);
        card.appendChild(badgeRing);

        // 2. Heading
        const heading = document.createElement("h2");
        heading.id = "udus-popup-title";
        heading.className = "udus-popup-title";
        heading.textContent = titleText;
        card.appendChild(heading);

        // 3. Message sentence
        const messageP = document.createElement("p");
        messageP.id = "udus-popup-message";
        messageP.className = "udus-popup-message";
        messageP.textContent = messageText;
        card.appendChild(messageP);

        // 4. Action Buttons
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "udus-popup-actions";

        const hasSecondary = Boolean(options.secondary && options.secondary.label);
        const hasPrimary = Boolean(options.primary && options.primary.label);

        if (!hasSecondary) {
            actionsDiv.classList.add("single-btn");
        }

        // Secondary Button (outline)
        if (hasSecondary) {
            let secBtn;
            if (options.secondary.href) {
                secBtn = document.createElement("a");
                secBtn.href = options.secondary.href;
            } else {
                secBtn = document.createElement("button");
                secBtn.type = "button";
            }
            secBtn.className = "udus-popup-btn udus-popup-btn-secondary";
            secBtn.textContent = options.secondary.label;

            secBtn.addEventListener("click", (e) => {
                if (typeof options.secondary.onClick === "function") {
                    options.secondary.onClick(e);
                } else if (!options.secondary.href) {
                    closePopup();
                }
            });
            actionsDiv.appendChild(secBtn);
        }

        // Primary Button (purple)
        if (hasPrimary || !hasSecondary) {
            const primaryConfig = options.primary || { label: "OK" };
            let priBtn;
            if (primaryConfig.href) {
                priBtn = document.createElement("a");
                priBtn.href = primaryConfig.href;
            } else {
                priBtn = document.createElement("button");
                priBtn.type = "button";
            }
            priBtn.className = "udus-popup-btn udus-popup-btn-primary";
            priBtn.textContent = primaryConfig.label || "OK";

            priBtn.addEventListener("click", (e) => {
                if (typeof primaryConfig.onClick === "function") {
                    primaryConfig.onClick(e);
                } else if (!primaryConfig.href) {
                    closePopup();
                }
            });
            actionsDiv.appendChild(priBtn);
        }

        card.appendChild(actionsDiv);
        overlay.appendChild(card);

        // Overlay click handling
        if (dismissible) {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    closePopup();
                }
            });
        }

        // Lock body scrolling
        document.body.style.overflow = "hidden";
        document.body.appendChild(overlay);
        currentOverlay = overlay;

        // Focus management & Trap focus inside modal
        const focusableElements = card.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])");
        const firstFocusable = focusableElements[focusableElements.length - 1] || card; // default to primary button or card
        setTimeout(() => {
            firstFocusable.focus();
        }, 30);

        keydownListener = function (e) {
            if (e.key === "Escape" && dismissible) {
                e.preventDefault();
                closePopup();
                return;
            }

            if (e.key === "Tab") {
                const focusables = Array.from(card.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])"));
                if (focusables.length === 0) {
                    e.preventDefault();
                    return;
                }
                const first = focusables[0];
                const last = focusables[focusables.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === first || document.activeElement === card) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            }
        };
        document.addEventListener("keydown", keydownListener);
    }

    /**
     * Demo walkthrough showing every type and icon step-by-step for console testing.
     */
    function runDemo() {
        const demoSteps = [
            {
                type: "error",
                icon: "error",
                title: "Admission number not found",
                message: "We could not find that admission number. Check it and try again.",
                primary: { label: "Try again" }
            },
            {
                type: "warning",
                icon: "warning",
                title: "Ballot already issued",
                message: "A ballot has already been issued for this admission number in this session.",
                secondary: { label: "OK" },
                primary: { label: "Check my vote" }
            },
            {
                type: "info",
                icon: "info",
                title: "Your vote was not recorded",
                message: "You can submit again.",
                primary: { label: "Submit again" }
            },
            {
                type: "success",
                icon: "check",
                title: "Vote recorded successfully",
                message: "Your ballot was permanently confirmed on the blockchain.",
                primary: { label: "View Receipt" }
            },
            {
                type: "error",
                icon: "no-entry",
                title: "Voting is not open",
                message: "Voting has not opened yet or the election has ended.",
                secondary: { label: "Back to Home" },
                primary: { label: "OK" }
            },
            {
                type: "warning",
                icon: "clock",
                title: "Session expired",
                message: "Your voting session has expired. Please log in again.",
                primary: { label: "Log in again" }
            },
            {
                type: "error",
                icon: "lock",
                title: "Not eligible to vote",
                message: "This admission number is not eligible to vote in this election. Contact the SUG ICT Team.",
                primary: { label: "OK" }
            },
            {
                type: "error",
                icon: "offline",
                title: "Connection problem",
                message: "We could not reach the server. Check your internet connection and try again.",
                primary: { label: "Try again" }
            }
        ];

        let currentIndex = 0;

        function showStep(index) {
            if (index >= demoSteps.length) {
                closePopup();
                return;
            }

            const step = demoSteps[index];
            const isLast = index === demoSteps.length - 1;

            showPopup({
                type: step.type,
                icon: step.icon,
                title: step.title,
                message: step.message,
                secondary: step.secondary ? {
                    label: step.secondary.label,
                    onClick: () => {
                        currentIndex++;
                        showStep(currentIndex);
                    }
                } : null,
                primary: {
                    label: isLast ? "Finish Demo" : `Next (${index + 1}/${demoSteps.length})`,
                    onClick: () => {
                        currentIndex++;
                        showStep(currentIndex);
                    }
                },
                dismissible: true
            });
        }

        showStep(currentIndex);
    }

    // Expose on window.UdusPopup
    window.UdusPopup = {
        show: showPopup,
        close: closePopup,
        demo: runDemo,
        safeMessage: safeMessage,
        isSafeMessage: isSafeMessage
    };
})();
