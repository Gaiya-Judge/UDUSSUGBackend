/**
 * UDUS SUG Blockchain Voting System - Vote Success Receipt Page Logic
 * Handles dynamic receipt transaction hash display and clipboard copying.
 */

document.addEventListener("DOMContentLoaded", () => {
    initReceiptPage();
});

function initReceiptPage() {
    const txHashDisplay = document.getElementById("txHashDisplay");
    const copyBtn = document.getElementById("copyBtn");
    const copyTooltip = document.getElementById("copyTooltip");

    // 1. Retrieve transaction hash from query params or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const queryHash = urlParams.get("txHash") || urlParams.get("hash") || urlParams.get("receiptId");
    const sessionHash = sessionStorage.getItem("lastTxHash");

    // Use actual hash from ballot submission; fallback to reference sample if absent
    const defaultPlaceholderHash = "0x7a3f9e2c4b8d1f6e9a2c3d4e5f6a7b8c9d0e1f2a";
    const actualHash = (queryHash && queryHash.trim()) || (sessionHash && sessionHash.trim()) || defaultPlaceholderHash;

    if (txHashDisplay) {
        txHashDisplay.textContent = actualHash;
        txHashDisplay.setAttribute("title", actualHash);
    }

    // 2. Setup Copy to Clipboard functionality
    if (copyBtn && txHashDisplay) {
        let copyTimeout = null;

        copyBtn.addEventListener("click", async () => {
            const textToCopy = txHashDisplay.textContent.trim();
            if (!textToCopy) return;

            let copiedSuccessfully = false;

            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    copiedSuccessfully = true;
                } catch (err) {
                    console.warn("Clipboard API write failed, attempting fallback:", err);
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
    } catch (e) {
        console.error("Fallback clipboard copy failed:", e);
        return false;
    }
}
