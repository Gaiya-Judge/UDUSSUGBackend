/**
 * UDUS SUG Blockchain Voting System - Landing Page Controller (landing.js)
 * Handles state-aware hero, live turnout polling, clock synchronization,
 * and ticker countdown without any innerHTML usage.
 */

(function () {
    "use strict";

    // -------------------------------------------------------------
    // Configuration & State
    // -------------------------------------------------------------
    const ELECTION_POLL_INTERVAL_MS = 30000; // 30 seconds
    const TURNOUT_POLL_INTERVAL_MS = 15000;  // 15 seconds

    let electionState = null;
    let turnoutState = null;
    let serverClockOffsetMs = 0; // serverTime - browserTimestamp

    let electionTimerId = null;
    let turnoutTimerId = null;
    let countdownIntervalId = null;
    let turnoutFetchedForEnded = false;

    // DOM Elements
    const dom = {
        heroSubtitle: document.getElementById("heroSubtitle"),
        heroCtaBtn: document.getElementById("loginToVoteBtn"),
        heroViewResultsBtn: document.getElementById("heroViewResultsBtn"),
        turnoutCard: document.getElementById("liveTurnoutCard")
    };

    // -------------------------------------------------------------
    // Helper Utilities
    // -------------------------------------------------------------

    /**
     * Format ISO datetime to "Oct 9, 2026 at 6:00 PM"
     */
    function formatLocalTime(isoString) {
        if (!isoString) return "-";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "-";

        const datePart = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }).format(date);

        const timePart = new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        }).format(date);

        return `${datePart} at ${timePart}`;
    }

    /**
     * Format ISO date to "October 9, 2026"
     */
    function formatDateOnly(isoString) {
        if (!isoString) return "";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "";

        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        }).format(date);
    }

    /**
     * Format duration milliseconds into "02d 14h 32m 17s"
     */
    function formatDuration(diffMs) {
        if (diffMs <= 0) return "00d 00h 00m 00s";

        const totalSecs = Math.floor(diffMs / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;

        const pad = (n) => String(n).padStart(2, "0");

        if (days > 0) {
            return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
        }
        return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }

    /**
     * Pluralize vote unit: 1 -> "vote cast"; 0 and 2 or more -> "votes cast"
     */
    function formatVoteUnit(count) {
        return Number(count) === 1 ? "vote cast" : "votes cast";
    }

    /**
     * Build SVG element safely without innerHTML
     */
    function createSvgIcon(type) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("aria-hidden", "true");

        if (type === "arrow-right") {
            svg.setAttribute("width", "18");
            svg.setAttribute("height", "18");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2.2");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", "5");
            line.setAttribute("y1", "12");
            line.setAttribute("x2", "19");
            line.setAttribute("y2", "12");

            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyline.setAttribute("points", "12 5 19 12 12 19");

            svg.appendChild(line);
            svg.appendChild(polyline);
        } else if (type === "clock") {
            svg.setAttribute("class", "turnout-timer-icon");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("fill", "none");
            svg.setAttribute("stroke", "currentColor");
            svg.setAttribute("stroke-width", "2");
            svg.setAttribute("stroke-linecap", "round");
            svg.setAttribute("stroke-linejoin", "round");

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", "12");
            circle.setAttribute("cy", "12");
            circle.setAttribute("r", "10");

            const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
            polyline.setAttribute("points", "12 6 12 12 16 14");

            svg.appendChild(circle);
            svg.appendChild(polyline);
        }

        return svg;
    }

    // -------------------------------------------------------------
    // Data Fetching
    // -------------------------------------------------------------

    /**
     * Fetch election state from GET /api/election
     */
    async function fetchElection() {
        const browserTimestamp = Date.now();
        try {
            const res = await fetch("/api/election", {
                headers: { "Accept": "application/json" },
                cache: "no-store"
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            electionState = data;

            // Offset between server clock and browser clock
            if (data.serverTime) {
                const parsedServerTime = Date.parse(data.serverTime);
                if (!isNaN(parsedServerTime)) {
                    serverClockOffsetMs = parsedServerTime - browserTimestamp;
                }
            }

            renderHeroState();
            renderTurnoutCard();

            // Manage Turnout Polling according to election status
            const status = (data.status || "NOT_SCHEDULED").toUpperCase();
            if (status === "ONGOING") {
                startTurnoutPolling();
            } else if (status === "ENDED") {
                stopTurnoutPolling();
                if (!turnoutFetchedForEnded) {
                    turnoutFetchedForEnded = true;
                    fetchTurnout();
                }
            } else {
                stopTurnoutPolling();
            }

        } catch (err) {
            console.warn("Could not fetch election state:", err);
            // On election failure, hero shows fallback text and keeps Login to Vote active
            renderHeroFallback();
            renderTurnoutUnavailable();
        }
    }

    /**
     * Fetch turnout count from GET /api/turnout
     */
    async function fetchTurnout() {
        try {
            const res = await fetch("/api/turnout", {
                headers: { "Accept": "application/json" },
                cache: "no-store"
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            turnoutState = data;
            renderTurnoutCard();
        } catch (err) {
            console.warn("Could not fetch blockchain turnout:", err);
            // If chain is unreachable, preserve previous or show null flag
            turnoutState = { error: true };
            renderTurnoutCard();
        }
    }

    // -------------------------------------------------------------
    // Polling Lifecycle Management
    // -------------------------------------------------------------

    function startElectionPolling() {
        if (!electionTimerId) {
            electionTimerId = setInterval(fetchElection, ELECTION_POLL_INTERVAL_MS);
        }
    }

    function stopElectionPolling() {
        if (electionTimerId) {
            clearInterval(electionTimerId);
            electionTimerId = null;
        }
    }

    function startTurnoutPolling() {
        if (!turnoutTimerId) {
            fetchTurnout();
            turnoutTimerId = setInterval(fetchTurnout, TURNOUT_POLL_INTERVAL_MS);
        }
    }

    function stopTurnoutPolling() {
        if (turnoutTimerId) {
            clearInterval(turnoutTimerId);
            turnoutTimerId = null;
        }
    }

    function startCountdownTick() {
        if (!countdownIntervalId) {
            countdownIntervalId = setInterval(updateCountdownTicker, 1000);
        }
    }

    // Tab visibility handling (pause polling while tab is hidden)
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            stopElectionPolling();
            stopTurnoutPolling();
        } else {
            // Tab resumed: refresh data immediately and restart polling
            fetchElection();
            startElectionPolling();
        }
    });

    // -------------------------------------------------------------
    // State-Aware Hero Rendering (Text & CTA Buttons)
    // -------------------------------------------------------------

    function renderHeroFallback() {
        if (dom.heroSubtitle) {
            dom.heroSubtitle.textContent = "Transparent. Secure. For every student.";
        }
        if (dom.heroCtaBtn) {
            dom.heroCtaBtn.classList.remove("disabled");
            dom.heroCtaBtn.removeAttribute("aria-disabled");
            dom.heroCtaBtn.setAttribute("href", "login.html");
            setButtonContent(dom.heroCtaBtn, "Voter Login", true);
        }
        if (dom.heroViewResultsBtn) {
            dom.heroViewResultsBtn.classList.add("d-none");
        }
    }

    function renderHeroState() {
        if (!electionState) {
            renderHeroFallback();
            return;
        }

        const status = (electionState.status || "NOT_SCHEDULED").toUpperCase();

        // 1. Primary CTA button: always enabled, links to login.html with "Voter Login" and arrow
        if (dom.heroCtaBtn) {
            dom.heroCtaBtn.classList.remove("disabled");
            dom.heroCtaBtn.removeAttribute("aria-disabled");
            dom.heroCtaBtn.setAttribute("href", "login.html");
            setButtonContent(dom.heroCtaBtn, "Voter Login", true);
        }

        // 2. Secondary "View Results" button: visible ONLY when status is ENDED
        if (dom.heroViewResultsBtn) {
            if (status === "ENDED") {
                dom.heroViewResultsBtn.classList.remove("d-none");
            } else {
                dom.heroViewResultsBtn.classList.add("d-none");
            }
        }

        // 3. Subtitle text according to election status
        if (dom.heroSubtitle) {
            switch (status) {
                case "ONGOING":
                    dom.heroSubtitle.textContent = "The SUG Elections are now live on the blockchain. Transparent. Secure. For every student.";
                    break;

                case "UPCOMING": {
                    const openDate = electionState.startTime ? formatDateOnly(electionState.startTime) : "soon";
                    dom.heroSubtitle.textContent = `The SUG Elections open on ${openDate}. Transparent. Secure. For every student.`;
                    break;
                }

                case "ENDED":
                    dom.heroSubtitle.textContent = "The SUG Elections have ended. Official results are on the blockchain.";
                    break;

                case "NOT_SCHEDULED":
                default:
                    dom.heroSubtitle.textContent = "The next SUG Elections will be announced soon. Transparent. Secure. For every student.";
                    break;
            }
        }
    }

    /**
     * Safely updates button text and optional trailing arrow SVG without innerHTML
     */
    function setButtonContent(btn, text, includeArrow) {
        const textSpan = document.createElement("span");
        textSpan.textContent = text;

        if (includeArrow) {
            const arrowSvg = createSvgIcon("arrow-right");
            btn.replaceChildren(textSpan, arrowSvg);
        } else {
            btn.replaceChildren(textSpan);
        }
    }

    // -------------------------------------------------------------
    // Live Turnout Card DOM Rendering (Strict textContent Only)
    // -------------------------------------------------------------

    function renderTurnoutUnavailable() {
        if (!dom.turnoutCard) return;

        const headerRow = document.createElement("div");
        headerRow.className = "turnout-header-row";

        const label = document.createElement("span");
        label.className = "turnout-badge-label";
        label.textContent = "Live data unavailable";

        headerRow.appendChild(label);

        const subDetail = document.createElement("div");
        subDetail.className = "turnout-sub-detail";
        subDetail.textContent = "Connecting to election network...";

        dom.turnoutCard.replaceChildren(headerRow, subDetail);
    }

    function renderTurnoutCard() {
        if (!dom.turnoutCard) return;

        if (!electionState) {
            renderTurnoutUnavailable();
            return;
        }

        const status = (electionState.status || "NOT_SCHEDULED").toUpperCase();

        if (status === "NOT_SCHEDULED") {
            const headerRow = document.createElement("div");
            headerRow.className = "turnout-header-row";

            const label = document.createElement("span");
            label.className = "turnout-badge-label";
            label.textContent = "Election Schedule";

            headerRow.appendChild(label);

            const msg = document.createElement("div");
            msg.className = "turnout-sub-detail";
            msg.textContent = "No election scheduled yet. Check back soon.";

            dom.turnoutCard.replaceChildren(headerRow, msg);
            return;
        }

        if (status === "UPCOMING") {
            renderUpcomingCard();
            return;
        }

        if (status === "ONGOING") {
            renderOngoingCard();
            return;
        }

        if (status === "ENDED") {
            renderEndedCard();
            return;
        }
    }

    function renderUpcomingCard() {
        const frag = document.createDocumentFragment();

        // 1. Header Row: "ELECTION STARTS IN" above it
        const headerRow = document.createElement("div");
        headerRow.className = "turnout-header-row";

        const label = document.createElement("span");
        label.className = "turnout-badge-label";
        label.textContent = "ELECTION STARTS IN";

        headerRow.appendChild(label);
        frag.appendChild(headerRow);

        // 2. Headline element: large ticking countdown (no vote number)
        const countdownDisplay = document.createElement("div");
        countdownDisplay.className = "turnout-headline-countdown";
        countdownDisplay.id = "turnoutTickerText";
        countdownDisplay.textContent = computeUpcomingCountdown();
        frag.appendChild(countdownDisplay);

        // 3. Local start date and time below it
        const subDetail = document.createElement("div");
        subDetail.className = "turnout-sub-detail";
        subDetail.textContent = electionState.startTime
            ? `Voting opens ${formatLocalTime(electionState.startTime)}`
            : "Opening soon";
        frag.appendChild(subDetail);

        // 4. Session pill
        if (electionState.sessionLabel) {
            const footerMeta = document.createElement("div");
            footerMeta.className = "turnout-footer-meta";

            const sessionPill = document.createElement("span");
            sessionPill.className = "turnout-session-pill";
            sessionPill.textContent = `${electionState.sessionLabel} Session`;

            footerMeta.appendChild(sessionPill);
            frag.appendChild(footerMeta);
        }

        dom.turnoutCard.replaceChildren(frag);
    }

    function renderOngoingCard() {
        const frag = document.createDocumentFragment();

        // 1. Pulsing lavender dot + LIVE TURNOUT
        const headerRow = document.createElement("div");
        headerRow.className = "turnout-header-row";

        const dot = document.createElement("span");
        dot.className = "pulsing-dot";
        dot.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.className = "turnout-badge-label";
        label.textContent = "LIVE TURNOUT";

        headerRow.appendChild(dot);
        headerRow.appendChild(label);
        frag.appendChild(headerRow);

        // 2. Votes metric: count directly under label, unit directly under count
        const metricGroup = document.createElement("div");
        metricGroup.className = "turnout-metric-group";

        const countDisplay = document.createElement("div");
        countDisplay.className = "turnout-count-display";

        const hasValidVotes = turnoutState && !turnoutState.error && turnoutState.totalVotesCast !== undefined && turnoutState.totalVotesCast !== null;
        if (hasValidVotes) {
            countDisplay.textContent = Number(turnoutState.totalVotesCast).toLocaleString();
        } else {
            countDisplay.textContent = "-";
        }

        const unitDisplay = document.createElement("div");
        unitDisplay.className = "turnout-count-unit";
        unitDisplay.textContent = hasValidVotes ? formatVoteUnit(turnoutState.totalVotesCast) : "votes cast";

        metricGroup.appendChild(countDisplay);
        metricGroup.appendChild(unitDisplay);

        // If GET /api/turnout returns totalEligibleVoters, show second line "of Y eligible voters" with percentage in medium bold, and 8px progress bar
        if (turnoutState && !turnoutState.error && turnoutState.totalEligibleVoters !== undefined && turnoutState.totalEligibleVoters !== null) {
            const eligibleCount = Number(turnoutState.totalEligibleVoters);
            if (!isNaN(eligibleCount) && eligibleCount > 0) {
                const votesCount = Number(turnoutState.totalVotesCast || 0);
                const pct = Math.min(100, Math.round((votesCount / eligibleCount) * 100));

                const eligibleSub = document.createElement("div");
                eligibleSub.className = "turnout-eligible-sub";

                const prefixText = document.createTextNode(`of ${eligibleCount.toLocaleString()} eligible voters `);
                const pctSpan = document.createElement("span");
                pctSpan.className = "turnout-percentage-bold";
                pctSpan.textContent = `(${pct}%)`;

                eligibleSub.appendChild(prefixText);
                eligibleSub.appendChild(pctSpan);
                metricGroup.appendChild(eligibleSub);

                const progressTrack = document.createElement("div");
                progressTrack.className = "turnout-progress-track";

                const progressFill = document.createElement("div");
                progressFill.className = "turnout-progress-fill";
                progressFill.style.width = `${pct}%`;

                progressTrack.appendChild(progressFill);
                metricGroup.appendChild(progressTrack);
            }
        }

        frag.appendChild(metricGroup);

        // 3. Countdown row: "Voting ends in 02d 14h 32m 17s"
        const countdownRow = document.createElement("div");
        countdownRow.className = "turnout-countdown-row";

        const timerIcon = createSvgIcon("clock");
        const tickerSpan = document.createElement("span");
        tickerSpan.id = "turnoutTickerText";
        tickerSpan.textContent = computeOngoingCountdown();

        countdownRow.appendChild(timerIcon);
        countdownRow.appendChild(tickerSpan);
        frag.appendChild(countdownRow);

        // 4. Session pill
        if (electionState.sessionLabel) {
            const footerMeta = document.createElement("div");
            footerMeta.className = "turnout-footer-meta";

            const sessionPill = document.createElement("span");
            sessionPill.className = "turnout-session-pill";
            sessionPill.textContent = `${electionState.sessionLabel} Session`;

            footerMeta.appendChild(sessionPill);
            frag.appendChild(footerMeta);
        }

        dom.turnoutCard.replaceChildren(frag);
    }

    function renderEndedCard() {
        const frag = document.createDocumentFragment();

        // 1. FINAL TURNOUT label
        const headerRow = document.createElement("div");
        headerRow.className = "turnout-header-row";

        const label = document.createElement("span");
        label.className = "turnout-badge-label";
        label.textContent = "FINAL TURNOUT";

        headerRow.appendChild(label);
        frag.appendChild(headerRow);

        // 2. Final votes cast metric: count directly under label, unit directly under count
        const metricGroup = document.createElement("div");
        metricGroup.className = "turnout-metric-group";

        const countDisplay = document.createElement("div");
        countDisplay.className = "turnout-count-display";

        const hasValidVotes = turnoutState && !turnoutState.error && turnoutState.totalVotesCast !== undefined && turnoutState.totalVotesCast !== null;
        if (hasValidVotes) {
            countDisplay.textContent = Number(turnoutState.totalVotesCast).toLocaleString();
        } else {
            countDisplay.textContent = "-";
        }

        const unitDisplay = document.createElement("div");
        unitDisplay.className = "turnout-count-unit";
        unitDisplay.textContent = hasValidVotes ? formatVoteUnit(turnoutState.totalVotesCast) : "votes cast";

        metricGroup.appendChild(countDisplay);
        metricGroup.appendChild(unitDisplay);

        // If GET /api/turnout returns totalEligibleVoters, show second line "of Y eligible voters" with percentage in medium bold, and 8px progress bar
        if (turnoutState && !turnoutState.error && turnoutState.totalEligibleVoters !== undefined && turnoutState.totalEligibleVoters !== null) {
            const eligibleCount = Number(turnoutState.totalEligibleVoters);
            if (!isNaN(eligibleCount) && eligibleCount > 0) {
                const votesCount = Number(turnoutState.totalVotesCast || 0);
                const pct = Math.min(100, Math.round((votesCount / eligibleCount) * 100));

                const eligibleSub = document.createElement("div");
                eligibleSub.className = "turnout-eligible-sub";

                const prefixText = document.createTextNode(`of ${eligibleCount.toLocaleString()} eligible voters `);
                const pctSpan = document.createElement("span");
                pctSpan.className = "turnout-percentage-bold";
                pctSpan.textContent = `(${pct}%)`;

                eligibleSub.appendChild(prefixText);
                eligibleSub.appendChild(pctSpan);
                metricGroup.appendChild(eligibleSub);

                const progressTrack = document.createElement("div");
                progressTrack.className = "turnout-progress-track";

                const progressFill = document.createElement("div");
                progressFill.className = "turnout-progress-fill";
                progressFill.style.width = `${pct}%`;

                progressTrack.appendChild(progressFill);
                metricGroup.appendChild(progressTrack);
            }
        }

        frag.appendChild(metricGroup);

        // 3. Sub detail
        const subDetail = document.createElement("div");
        subDetail.className = "turnout-sub-detail";
        subDetail.textContent = electionState.endTime
            ? `Voting ended ${formatLocalTime(electionState.endTime)}`
            : "Voting concluded";
        frag.appendChild(subDetail);

        // 4. Footer with session label and "View Results" link
        const footerMeta = document.createElement("div");
        footerMeta.className = "turnout-footer-meta";

        if (electionState.sessionLabel) {
            const sessionPill = document.createElement("span");
            sessionPill.className = "turnout-session-pill";
            sessionPill.textContent = `${electionState.sessionLabel} Session`;
            footerMeta.appendChild(sessionPill);
        }

        const resultsLink = document.createElement("a");
        resultsLink.className = "turnout-action-link";
        resultsLink.setAttribute("href", "results.html");
        resultsLink.textContent = "View Results →";
        footerMeta.appendChild(resultsLink);

        frag.appendChild(footerMeta);

        dom.turnoutCard.replaceChildren(frag);
    }

    // -------------------------------------------------------------
    // Live Ticker Calculations
    // -------------------------------------------------------------

    function computeOngoingCountdown() {
        if (!electionState || !electionState.endTime) return "Voting active";
        const endMs = Date.parse(electionState.endTime);
        if (isNaN(endMs)) return "Voting active";

        const currentServerTime = Date.now() + serverClockOffsetMs;
        const diffMs = endMs - currentServerTime;

        if (diffMs > 0) {
            return `Voting ends in ${formatDuration(diffMs)}`;
        } else {
            return "Voting concluding...";
        }
    }

    function computeUpcomingCountdown() {
        if (!electionState || !electionState.startTime) return "Starting soon";
        const startMs = Date.parse(electionState.startTime);
        if (isNaN(startMs)) return "Starting soon";

        const currentServerTime = Date.now() + serverClockOffsetMs;
        const diffMs = startMs - currentServerTime;

        if (diffMs > 0) {
            return formatDuration(diffMs);
        } else {
            return "Starting soon";
        }
    }

    function updateCountdownTicker() {
        const tickerElement = document.getElementById("turnoutTickerText");
        if (!tickerElement || !electionState) return;

        const status = (electionState.status || "").toUpperCase();
        if (status === "ONGOING") {
            tickerElement.textContent = computeOngoingCountdown();
        } else if (status === "UPCOMING") {
            tickerElement.textContent = computeUpcomingCountdown();
        }
    }

    // -------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        // Initial fetch
        fetchElection();

        // Start polling intervals
        startElectionPolling();
        startCountdownTick();
    });

})();
