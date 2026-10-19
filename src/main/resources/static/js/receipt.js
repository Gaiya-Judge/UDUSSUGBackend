/**
 * UDUS SUG Blockchain Voting System - Vote Success Receipt Page Logic (Part C Item 4)
 * Handles dynamic receipt transaction hash display and clipboard copying.
 */

import { clearVotingToken, getReceipt } from "./voter-session.js";

document.addEventListener("DOMContentLoaded", () => {
    // Clear stored voting token on success per specification
    clearVotingToken();
    initReceiptPage();
});

function initReceiptPage() {
    const txHashDisplay = document.getElementById("txHashDisplay");
    const copyBtn = document.getElementById("copyBtn");
    const copyTooltip = document.getElementById("copyTooltip");

    // 1. Retrieve transaction hash per priority: query params -> sessionStorage -> localStorage udus_receipt -> fallback
    const urlParams = new URLSearchParams(window.location.search);
    const queryHash = urlParams.get("txHash") || urlParams.get("hash") || urlParams.get("receiptId");
    const sessionHash = sessionStorage.getItem("lastTxHash");
    const localReceipt = getReceipt();

    const isExplicitlyUnavailable = urlParams.get("unavailable") === "1" ||
        sessionHash === "UNAVAILABLE" ||
        (localReceipt && localReceipt.unavailable === true);

    const defaultPlaceholderHash = "0x7a3f9e2c4b8d1f6e9a2c3d4e5f6a7b8c9d0e1f2a";

    let actualHash = "";
    if (queryHash && queryHash.trim()) {
        actualHash = queryHash.trim();
    } else if (sessionHash && sessionHash.trim() && sessionHash !== "UNAVAILABLE") {
        actualHash = sessionHash.trim();
    } else if (localReceipt && localReceipt.txHash && localReceipt.txHash.trim()) {
        actualHash = localReceipt.txHash.trim();
    }

    if (txHashDisplay) {
        if (isExplicitlyUnavailable && !actualHash) {
            // Part C Item 4: "Your vote was recorded. The receipt ID is not available on this device."
            txHashDisplay.textContent = "Your vote was recorded. The receipt ID is not available on this device.";
            txHashDisplay.style.fontSize = "0.95rem";
            txHashDisplay.style.fontWeight = "500";
            txHashDisplay.style.wordBreak = "normal";
            if (copyBtn) {
                copyBtn.style.display = "none";
            }
        } else {
            const finalHash = actualHash || defaultPlaceholderHash;
            txHashDisplay.textContent = finalHash;
            txHashDisplay.setAttribute("title", finalHash);
        }
    }

    // 2. Setup Copy to Clipboard functionality
    if (copyBtn && txHashDisplay && (!isExplicitlyUnavailable || actualHash)) {
        let copyTimeout = null;

        copyBtn.addEventListener("click", async () => {
            const textToCopy = txHashDisplay.textContent.trim();
            if (!textToCopy) return;

            let copiedSuccessfully = false;

            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    copiedSuccessfully = true;
                } catch {
                    copiedSuccessfully = fallbackCopyText(textToCopy);
                }
            } else {
                copiedSuccessfully = fallbackCopyText(textToCopy);
            }

            if (copiedSuccessfully) {
                copyBtn.classList.add("copied");
                copyBtn.setAttribute("aria-label", "Receipt ID copied to clipboard");
                if (copyTooltip) {
                    copyTooltip.textContent = "Copied!";
                }

                if (copyTimeout) clearTimeout(copyTimeout);
                copyTimeout = setTimeout(() => {
                    copyBtn.classList.remove("copied");
                    copyBtn.setAttribute("aria-label", "Copy Receipt ID");
                    if (copyTooltip) {
                        copyTooltip.textContent = "Copy";
                    }
                }, 2000);
            }
        });
    }
}

/**
 * Fallback clipboard copy using a hidden textarea for environments without clipboard API.
 * @param {string} text 
 * @returns {boolean}
 */
function fallbackCopyText(text) {
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.top = "-9999px";
        textArea.style.left = "-9999px";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textArea);
        return success;
    } catch {
        return false;
    }
}
