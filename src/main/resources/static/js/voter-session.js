/**
 * UDUS SUG Blockchain Voting System - Voter Session Storage & Self-Recovery (Part C)
 * 
 * Manages:
 * - LocalStorage udus_voting_token: { token, savedAt: Date.now() }
 * - 30-minute purge based on savedAt
 * - Public POST /api/vote/token-status integration
 * - udus_receipt persistence
 */

import { apiRequest } from "./api.js";

const VOTING_TOKEN_KEY = "udus_voting_token";
const RECEIPT_KEY = "udus_receipt";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Purge token if older than 30 minutes or corrupted.
 * Returns valid token string or null.
 */
export function purgeVotingToken() {
    try {
        const raw = localStorage.getItem(VOTING_TOKEN_KEY);
        if (!raw) return null;

        const data = JSON.parse(raw);
        if (!data || typeof data.token !== "string" || !data.token.trim()) {
            localStorage.removeItem(VOTING_TOKEN_KEY);
            return null;
        }

        if (typeof data.savedAt !== "number" || (Date.now() - data.savedAt) > MAX_AGE_MS) {
            localStorage.removeItem(VOTING_TOKEN_KEY);
            return null;
        }

        return data.token.trim();
    } catch {
        localStorage.removeItem(VOTING_TOKEN_KEY);
        return null;
    }
}

/**
 * Retrieve active voting token, automatically purging expired tokens.
 * @returns {string|null}
 */
export function getVotingToken() {
    return purgeVotingToken();
}

/**
 * Store voting token with current timestamp in localStorage.
 * Does not store admission number or any other voter data.
 * @param {string} token
 */
export function setVotingToken(token) {
    if (!token || typeof token !== "string" || !token.trim()) {
        clearVotingToken();
        return;
    }

    const payload = {
        token: token.trim(),
        savedAt: Date.now()
    };
    try {
        localStorage.setItem(VOTING_TOKEN_KEY, JSON.stringify(payload));
    } catch (e) {
        console.error("Failed to save voting token to localStorage:", e);
    }
}

/**
 * Clear stored voting token from localStorage.
 */
export function clearVotingToken() {
    localStorage.removeItem(VOTING_TOKEN_KEY);
    // Also clean legacy sessionStorage key if present
    sessionStorage.removeItem("votingToken");
    sessionStorage.removeItem("votingTokenExpiresAt");
}

/**
 * Check if a non-expired token exists on this device.
 * @returns {boolean}
 */
export function hasVotingToken() {
    return purgeVotingToken() !== null;
}

/**
 * Persist receipt data to localStorage under udus_receipt and sessionStorage lastTxHash.
 * If txHash is unavailable, saves { txHash: null, unavailable: true }.
 * 
 * @param {string|null} txHash
 */
export function saveReceipt(txHash) {
    const cleanHash = (txHash && typeof txHash === "string" && txHash.trim()) ? txHash.trim() : null;
    const payload = {
        txHash: cleanHash,
        unavailable: !cleanHash,
        savedAt: Date.now()
    };

    try {
        localStorage.setItem(RECEIPT_KEY, JSON.stringify(payload));
    } catch (e) {
        console.error("Failed to save receipt to localStorage:", e);
    }

    if (cleanHash) {
        sessionStorage.setItem("lastTxHash", cleanHash);
    } else {
        sessionStorage.setItem("lastTxHash", "UNAVAILABLE");
    }
}

/**
 * Retrieve saved receipt from localStorage.
 * @returns {{ txHash: string|null, unavailable?: boolean }|null}
 */
export function getReceipt() {
    try {
        const raw = localStorage.getItem(RECEIPT_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Query public backend endpoint POST /api/vote/token-status
 * 
 * @param {string} token
 * @returns {Promise<{ ok: boolean, status: 'VALID'|'USED'|'EXPIRED'|'UNKNOWN', expiresAt: string|null, transactionHash: string|null }>}
 */
export async function checkTokenStatus(token) {
    if (!token) {
        return { ok: false, status: "UNKNOWN", expiresAt: null, transactionHash: null };
    }

    try {
        const response = await apiRequest("/api/vote/token-status", {
            method: "POST",
            body: { token: token.trim() }
        });

        if (response.ok && response.status === 200 && response.data) {
            const rawStatus = (response.data.status || "UNKNOWN").toUpperCase();
            return {
                ok: true,
                status: rawStatus,
                expiresAt: response.data.expiresAt || null,
                transactionHash: response.data.transactionHash || null
            };
        }

        return {
            ok: false,
            status: "UNKNOWN",
            expiresAt: null,
            transactionHash: null
        };
    } catch (err) {
        return {
            ok: false,
            status: "UNKNOWN",
            expiresAt: null,
            transactionHash: null
        };
    }
}

/**
 * Execute Part C item 3 "Check my vote" recovery flow:
 * - USED -> save receipt and navigate to receipt.html
 * - VALID -> info popup "Your vote was not recorded", "You can submit again." [Submit again]
 * - EXPIRED or UNKNOWN -> clock popup "Session expired", clear token
 * 
 * @param {Object} [options]
 * @param {Function} [options.onValidSubmitAgain] - Optional callback when valid and submitting again
 */
export async function runCheckMyVote(options = {}) {
    const token = getVotingToken();
    if (!token) {
        if (window.UdusPopup) {
            window.UdusPopup.show({
                type: "warning",
                icon: "clock",
                title: "Session expired",
                message: "Your session expired before your vote was recorded. Please contact the SUG ICT Team.",
                primary: {
                    label: "OK",
                    href: "login.html"
                },
                dismissible: true
            });
        } else {
            window.location.href = "login.html";
        }
        return;
    }

    const result = await checkTokenStatus(token);

    if (result.status === "USED") {
        saveReceipt(result.transactionHash);
        clearVotingToken();
        const url = result.transactionHash
            ? `receipt.html?txHash=${encodeURIComponent(result.transactionHash)}`
            : "receipt.html?unavailable=1";
        window.location.href = url;
        return;
    }

    if (result.status === "VALID") {
        if (window.UdusPopup) {
            window.UdusPopup.show({
                type: "info",
                icon: "info",
                title: "Your vote was not recorded",
                message: "You can submit again.",
                primary: {
                    label: "Submit again",
                    onClick: () => {
                        window.UdusPopup.close();
                        if (typeof options.onValidSubmitAgain === "function") {
                            options.onValidSubmitAgain();
                        } else if (!window.location.pathname.endsWith("ballot.html")) {
                            window.location.href = "ballot.html";
                        }
                    }
                },
                dismissible: true
            });
        }
        return;
    }

    // EXPIRED or UNKNOWN
    clearVotingToken();
    if (window.UdusPopup) {
        window.UdusPopup.show({
            type: "warning",
            icon: "clock",
            title: "Session expired",
            message: "Your session expired before your vote was recorded. Please contact the SUG ICT Team.",
            primary: {
                label: "OK",
                href: "login.html"
            },
            dismissible: false
        });
    } else {
        window.location.href = "login.html";
    }
}
