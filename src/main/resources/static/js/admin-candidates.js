/**
 * UDUS SUG Blockchain Voting System - Admin Candidates Management
 * 
 * Manages:
 * - Fetching active candidates from GET /api/admin/candidates (working session)
 * - Fetching election status from GET /api/election for setup lock checking
 * - Lock rule: locked when status == ONGOING or (status == ENDED && closed != true)
 * - Fetching positions from GET /api/admin/positions for modal dropdowns
 * - Safe text rendering with textContent (zero innerHTML for names/departments)
 * - Two-letter initials avatar matching ballot.js design
 * - Modals for Add Candidate (POST), Edit Candidate (PUT), and Delete (DELETE)
 * - Blockchain submission progress indication ("Submitting to blockchain...")
 * - Double-submit guard
 * - Inline modal error banners (handling 409 lock, 500 blockchain failure with "Nothing was saved.")
 * - Success toast notifications (green allowed for success states)
 * - Pagination if list exceeds 15 rows
 */

import { apiFetch } from "./admin-common.js";

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
let allCandidates = [];
let allPositions = [];
let isPageLocked = false;
let workingSession = "";
let currentPage = 1;
const PAGE_SIZE = 15;
let isSubmitting = false;

// -------------------------------------------------------------
// Initials & Avatar Palette Logic (reused from ballot.js)
// -------------------------------------------------------------
function getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTES = [
    { bg: "#EDE8F8", color: "#372859" },
    { bg: "#E0E7FF", color: "#3730A3" },
    { bg: "#E0F2FE", color: "#0369A1" },
    { bg: "#FCE7F3", color: "#9D174D" },
    { bg: "#FEF3C7", color: "#92400E" },
    { bg: "#DCFCE7", color: "#166534" }
];

function getAvatarPalette(id) {
    const num = Math.abs(Number(id) || 0);
    return AVATAR_PALETTES[num % AVATAR_PALETTES.length];
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message) {
    let container = document.getElementById("adminToastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "adminToastContainer";
        container.className = "admin-toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "admin-toast";

    const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    iconSvg.setAttribute("viewBox", "0 0 24 24");
    iconSvg.setAttribute("fill", "none");
    iconSvg.setAttribute("stroke", "currentColor");
    iconSvg.setAttribute("stroke-width", "2.5");
    iconSvg.setAttribute("stroke-linecap", "round");
    iconSvg.setAttribute("stroke-linejoin", "round");
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", "20 6 9 17 4 12");
    iconSvg.appendChild(polyline);

    const span = document.createElement("span");
    span.textContent = message;

    toast.appendChild(iconSvg);
    toast.appendChild(span);
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        toast.style.opacity = "0";
        toast.style.transform = "translateX(30px)";
        setTimeout(() => toast.remove(), 350);
    }, 4000);
}

// -------------------------------------------------------------
// Lock State Checking
// -------------------------------------------------------------
export async function checkLockState() {
    const lockBanner = document.getElementById("adminLockedBanner");
    const addBtn = document.getElementById("btnAddCandidate");

    try {
        const res = await apiFetch("/api/election");
        if (res.ok && res.data) {
            const { status, closed } = res.data;
            const s = (status || "").toUpperCase();

            // Page is LOCKED when status is ONGOING, or when status is ENDED and closed is false
            isPageLocked = (s === "ONGOING") || (s === "ENDED" && closed !== true);
        } else {
            isPageLocked = false;
        }
    } catch {
        isPageLocked = false;
    }

    if (isPageLocked) {
        if (lockBanner) lockBanner.classList.add("show");
        if (addBtn) {
            addBtn.disabled = true;
            addBtn.setAttribute("title", "Changes are locked while voting is in progress or election has not closed");
        }
    } else {
        if (lockBanner) lockBanner.classList.remove("show");
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.removeAttribute("title");
        }
    }

    // Refresh action buttons enabled/disabled state in current rows
    document.querySelectorAll(".btn-action-icon").forEach(btn => {
        btn.disabled = isPageLocked;
    });
}

// -------------------------------------------------------------
// Data Fetching: Candidates & Positions
// -------------------------------------------------------------
export async function loadPositions() {
    try {
        const res = await apiFetch("/api/admin/positions");
        if (res.ok && Array.isArray(res.data)) {
            allPositions = res.data;
        } else {
            allPositions = [];
        }
    } catch {
        allPositions = [];
    }
}

export async function loadCandidates() {
    const tbody = document.getElementById("candidatesTableBody");
    const emptyState = document.getElementById("candidatesEmptyState");
    const tableContainer = document.getElementById("candidatesTableContainer");
    const workingSessionBadge = document.getElementById("workingSessionBadge");

    try {
        const res = await apiFetch("/api/admin/candidates");
        if (!res.ok) {
            throw new Error((res.data && res.data.message) ? res.data.message : `HTTP ${res.status}`);
        }

        allCandidates = Array.isArray(res.data) ? res.data : [];

        // Determine working session
        if (allCandidates.length > 0 && allCandidates[0].sessionLabel) {
            workingSession = allCandidates[0].sessionLabel;
        } else if (allPositions.length > 0 && allPositions[0].sessionLabel) {
            workingSession = allPositions[0].sessionLabel;
        } else {
            workingSession = "";
        }

        if (workingSessionBadge) {
            workingSessionBadge.textContent = workingSession || "-";
        }

        renderCandidateRows();

    } catch (err) {
        if (emptyState && tableContainer) {
            tableContainer.style.display = "none";
            emptyState.style.display = "block";
            emptyState.textContent = "Unable to load candidates: " + err.message;
        }
    }
}

// -------------------------------------------------------------
// Safe Table Rendering (textContent only, zero innerHTML injection)
// -------------------------------------------------------------
function renderCandidateRows() {
    const tbody = document.getElementById("candidatesTableBody");
    const emptyState = document.getElementById("candidatesEmptyState");
    const tableContainer = document.getElementById("candidatesTableContainer");
    const paginationBar = document.getElementById("candidatesPaginationBar");
    const pageInfo = document.getElementById("paginationInfo");

    if (!tbody || !emptyState || !tableContainer) return;

    if (allCandidates.length === 0) {
        tableContainer.style.display = "none";
        emptyState.style.display = "block";
        emptyState.textContent = "No candidates yet for this session.";
        if (paginationBar) paginationBar.style.display = "none";
        return;
    }

    emptyState.style.display = "none";
    tableContainer.style.display = "block";
    tbody.innerHTML = "";

    // Pagination Calculation
    const totalCount = allCandidates.length;
    const shouldPaginate = totalCount > PAGE_SIZE;

    let displayList = allCandidates;
    if (shouldPaginate) {
        const totalPages = Math.ceil(totalCount / PAGE_SIZE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = Math.min(startIndex + PAGE_SIZE, totalCount);
        displayList = allCandidates.slice(startIndex, endIndex);

        if (paginationBar) {
            paginationBar.style.display = "flex";
            if (pageInfo) {
                pageInfo.textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalCount} candidates`;
            }
            renderPaginationControls(totalPages);
        }
    } else {
        if (paginationBar) paginationBar.style.display = "none";
    }

    displayList.forEach(cand => {
        const tr = document.createElement("tr");

        // 1. Initials Avatar
        const tdAvatar = document.createElement("td");
        tdAvatar.style.width = "60px";
        const avatarWrap = document.createElement("div");
        avatarWrap.className = "candidate-avatar-wrap";
        const palette = getAvatarPalette(cand.id);
        avatarWrap.style.backgroundColor = palette.bg;
        avatarWrap.style.color = palette.color;

        const initialsSpan = document.createElement("span");
        initialsSpan.className = "candidate-avatar-initials";
        initialsSpan.textContent = getInitials(cand.name);
        avatarWrap.appendChild(initialsSpan);
        tdAvatar.appendChild(avatarWrap);
        tr.appendChild(tdAvatar);

        // 2. Name
        const tdName = document.createElement("td");
        tdName.style.fontWeight = "600";
        tdName.style.color = "#1E1533";
        tdName.textContent = cand.name || "Unnamed Candidate";
        tr.appendChild(tdName);

        // 3. Position
        const tdPosition = document.createElement("td");
        tdPosition.style.color = "#372859";
        tdPosition.style.fontWeight = "500";
        tdPosition.textContent = cand.positionName || "—";
        tr.appendChild(tdPosition);

        // 4. Department
        const tdDept = document.createElement("td");
        tdDept.style.color = "#64748B";
        tdDept.textContent = cand.department || "—";
        tr.appendChild(tdDept);

        // 5. Actions (Edit pencil & Delete trash)
        const tdActions = document.createElement("td");
        tdActions.style.textAlign = "right";
        tdActions.style.width = "100px";

        const actionsGroup = document.createElement("div");
        actionsGroup.className = "candidate-actions-group";

        // Edit Button
        const btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "btn-action-icon btn-action-edit";
        btnEdit.setAttribute("aria-label", `Edit ${cand.name}`);
        btnEdit.disabled = isPageLocked;

        const editSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        editSvg.setAttribute("viewBox", "0 0 24 24");
        editSvg.setAttribute("fill", "none");
        editSvg.setAttribute("stroke", "currentColor");
        editSvg.setAttribute("stroke-width", "2");
        editSvg.setAttribute("stroke-linecap", "round");
        editSvg.setAttribute("stroke-linejoin", "round");
        const pathEdit1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEdit1.setAttribute("d", "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7");
        const pathEdit2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEdit2.setAttribute("d", "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z");
        editSvg.appendChild(pathEdit1);
        editSvg.appendChild(pathEdit2);
        btnEdit.appendChild(editSvg);

        btnEdit.addEventListener("click", () => openEditModal(cand));
        actionsGroup.appendChild(btnEdit);

        // Delete Button
        const btnDelete = document.createElement("button");
        btnDelete.type = "button";
        btnDelete.className = "btn-action-icon btn-action-delete";
        btnDelete.setAttribute("aria-label", `Delete ${cand.name}`);
        btnDelete.disabled = isPageLocked;

        const deleteSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        deleteSvg.setAttribute("viewBox", "0 0 24 24");
        deleteSvg.setAttribute("fill", "none");
        deleteSvg.setAttribute("stroke", "currentColor");
        deleteSvg.setAttribute("stroke-width", "2");
        deleteSvg.setAttribute("stroke-linecap", "round");
        deleteSvg.setAttribute("stroke-linejoin", "round");
        const polylineDel = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polylineDel.setAttribute("points", "3 6 5 6 21 6");
        const pathDel1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathDel1.setAttribute("d", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2");
        const lineDel1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineDel1.setAttribute("x1", "10");
        lineDel1.setAttribute("y1", "11");
        lineDel1.setAttribute("x2", "10");
        lineDel1.setAttribute("y2", "17");
        const lineDel2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineDel2.setAttribute("x1", "14");
        lineDel2.setAttribute("y1", "11");
        lineDel2.setAttribute("x2", "14");
        lineDel2.setAttribute("y2", "17");
        deleteSvg.appendChild(polylineDel);
        deleteSvg.appendChild(pathDel1);
        deleteSvg.appendChild(lineDel1);
        deleteSvg.appendChild(lineDel2);
        btnDelete.appendChild(deleteSvg);

        btnDelete.addEventListener("click", () => openDeleteModal(cand));
        actionsGroup.appendChild(btnDelete);

        tdActions.appendChild(actionsGroup);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
}

function renderPaginationControls(totalPages) {
    const controls = document.getElementById("paginationControls");
    if (!controls) return;
    controls.innerHTML = "";

    // Prev Button
    const prevBtn = document.createElement("button");
    prevBtn.className = "btn-page";
    prevBtn.textContent = "‹";
    prevBtn.disabled = (currentPage === 1);
    prevBtn.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderCandidateRows();
        }
    });
    controls.appendChild(prevBtn);

    // Page Buttons
    for (let p = 1; p <= totalPages; p++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = `btn-page ${p === currentPage ? 'active' : ''}`;
        pageBtn.textContent = String(p);
        pageBtn.addEventListener("click", () => {
            currentPage = p;
            renderCandidateRows();
        });
        controls.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.className = "btn-page";
    nextBtn.textContent = "›";
    nextBtn.disabled = (currentPage === totalPages);
    nextBtn.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderCandidateRows();
        }
    });
    controls.appendChild(nextBtn);
}

// -------------------------------------------------------------
// Modal Dialogs & Blockchain Form Submissions
// -------------------------------------------------------------

function populatePositionSelect(selectEl, selectedId = null) {
    selectEl.innerHTML = "";
    if (allPositions.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No positions available";
        selectEl.appendChild(opt);
        return false;
    }

    allPositions.forEach(pos => {
        const opt = document.createElement("option");
        opt.value = String(pos.id);
        opt.textContent = pos.name;
        if (selectedId !== null && Number(pos.id) === Number(selectedId)) {
            opt.selected = true;
        }
        selectEl.appendChild(opt);
    });
    return true;
}

function showModalAlert(alertEl, message, isWarning = false) {
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = `modal-alert show ${isWarning ? 'modal-alert-warning' : 'modal-alert-danger'}`;
}

function hideModalAlert(alertEl) {
    if (!alertEl) return;
    alertEl.textContent = "";
    alertEl.className = "modal-alert";
}

function setSubmittingState(submitBtn, cancelBtn, modalEl, submitting, defaultLabel) {
    isSubmitting = submitting;
    if (submitBtn) {
        submitBtn.disabled = submitting;
        if (submitting) {
            submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                <span>Submitting to blockchain...</span>
            `;
        } else {
            submitBtn.textContent = defaultLabel;
        }
    }
    if (cancelBtn) {
        cancelBtn.disabled = submitting;
    }
}

// Format backend errors based on requirements:
// A 409 means changes are locked; show message and re-check lock state.
// A 500 that mentions blockchain failure: show message + "Nothing was saved."
async function handleBackendError(res, alertEl) {
    const errorData = res.data;
    let message = "An error occurred while communicating with the server.";

    if (errorData) {
        if (typeof errorData === "string") {
            message = errorData;
        } else if (errorData.message) {
            message = errorData.message;
        }
    }

    if (res.status === 409) {
        showModalAlert(alertEl, message);
        await checkLockState();
        return;
    }

    if (res.status === 500) {
        const lowerMsg = (message + "").toLowerCase();
        if (lowerMsg.includes("blockchain") || lowerMsg.includes("contract") || lowerMsg.includes("web3") || lowerMsg.includes("transaction")) {
            message = `${message} Nothing was saved.`;
        }
        showModalAlert(alertEl, message);
        return;
    }

    showModalAlert(alertEl, message);
}

// -------------------------------------------------------------
// ADD CANDIDATE MODAL
// -------------------------------------------------------------
export function openAddModal() {
    if (isPageLocked) return;

    const modal = new bootstrap.Modal(document.getElementById("addCandidateModal"));
    const form = document.getElementById("addCandidateForm");
    const nameInput = document.getElementById("addCandidateName");
    const deptInput = document.getElementById("addCandidateDept");
    const posSelect = document.getElementById("addCandidatePosition");
    const alertEl = document.getElementById("addModalAlert");
    const submitBtn = document.getElementById("addCandidateSubmitBtn");

    form.reset();
    hideModalAlert(alertEl);

    const hasPositions = populatePositionSelect(posSelect);
    if (!hasPositions) {
        showModalAlert(alertEl, "Add positions in Election Settings first", true);
        submitBtn.disabled = true;
    } else {
        submitBtn.disabled = false;
    }

    modal.show();
}

// -------------------------------------------------------------
// EDIT CANDIDATE MODAL
// -------------------------------------------------------------
let editingCandidateId = null;

export function openEditModal(cand) {
    if (isPageLocked) return;

    editingCandidateId = cand.id;
    const modal = new bootstrap.Modal(document.getElementById("editCandidateModal"));
    const nameInput = document.getElementById("editCandidateName");
    const deptInput = document.getElementById("editCandidateDept");
    const posSelect = document.getElementById("editCandidatePosition");
    const alertEl = document.getElementById("editModalAlert");
    const submitBtn = document.getElementById("editCandidateSubmitBtn");

    hideModalAlert(alertEl);
    nameInput.value = cand.name || "";
    deptInput.value = cand.department || "";

    populatePositionSelect(posSelect, cand.positionId);
    submitBtn.disabled = false;

    modal.show();
}

// -------------------------------------------------------------
// DELETE CANDIDATE MODAL
// -------------------------------------------------------------
let deletingCandidateId = null;

export function openDeleteModal(cand) {
    if (isPageLocked) return;

    deletingCandidateId = cand.id;
    const modal = new bootstrap.Modal(document.getElementById("deleteCandidateModal"));
    const nameSpan = document.getElementById("deleteCandidateName");
    const alertEl = document.getElementById("deleteModalAlert");
    const submitBtn = document.getElementById("deleteCandidateSubmitBtn");

    hideModalAlert(alertEl);
    if (nameSpan) nameSpan.textContent = cand.name || "this candidate";
    submitBtn.disabled = false;

    modal.show();
}

// -------------------------------------------------------------
// Form Submit Handlers
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initial Data Fetch
    await loadPositions();
    await checkLockState();
    await loadCandidates();

    // 2. Add Candidate Button click
    const addBtn = document.getElementById("btnAddCandidate");
    if (addBtn) {
        addBtn.addEventListener("click", () => openAddModal());
    }

    // 3. Add Candidate Form Submit
    const addForm = document.getElementById("addCandidateForm");
    if (addForm) {
        addForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (isSubmitting) return;

            const nameInput = document.getElementById("addCandidateName");
            const deptInput = document.getElementById("addCandidateDept");
            const posSelect = document.getElementById("addCandidatePosition");
            const alertEl = document.getElementById("addModalAlert");
            const submitBtn = document.getElementById("addCandidateSubmitBtn");
            const cancelBtn = document.getElementById("addCandidateCancelBtn");

            const name = nameInput.value.trim();
            const department = deptInput.value.trim();
            const positionId = Number(posSelect.value);

            if (!name || !department || isNaN(positionId)) {
                showModalAlert(alertEl, "Please fill in all required fields.");
                return;
            }

            hideModalAlert(alertEl);
            setSubmittingState(submitBtn, cancelBtn, "addCandidateModal", true, "Save Candidate");

            try {
                const res = await apiFetch("/api/admin/candidates", {
                    method: "POST",
                    body: {
                        positionId,
                        name,
                        department
                    }
                });

                if (res.ok) {
                    const modalEl = document.getElementById("addCandidateModal");
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) modalInstance.hide();

                    showToast("Candidate added successfully");
                    await loadCandidates();
                } else {
                    await handleBackendError(res, alertEl);
                }
            } catch (networkError) {
                showModalAlert(alertEl, networkError.message || "Network request failed");
            } finally {
                setSubmittingState(submitBtn, cancelBtn, "addCandidateModal", false, "Save Candidate");
            }
        });
    }

    // 4. Edit Candidate Form Submit
    const editForm = document.getElementById("editCandidateForm");
    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (isSubmitting || !editingCandidateId) return;

            const nameInput = document.getElementById("editCandidateName");
            const deptInput = document.getElementById("editCandidateDept");
            const posSelect = document.getElementById("editCandidatePosition");
            const alertEl = document.getElementById("editModalAlert");
            const submitBtn = document.getElementById("editCandidateSubmitBtn");
            const cancelBtn = document.getElementById("editCandidateCancelBtn");

            const name = nameInput.value.trim();
            const department = deptInput.value.trim();
            const positionId = Number(posSelect.value);

            if (!name || !department || isNaN(positionId)) {
                showModalAlert(alertEl, "Please fill in all required fields.");
                return;
            }

            hideModalAlert(alertEl);
            setSubmittingState(submitBtn, cancelBtn, "editCandidateModal", true, "Save Changes");

            try {
                const res = await apiFetch(`/api/admin/candidates/${editingCandidateId}`, {
                    method: "PUT",
                    body: {
                        name,
                        positionId,
                        department
                    }
                });

                if (res.ok) {
                    const modalEl = document.getElementById("editCandidateModal");
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) modalInstance.hide();

                    showToast("Candidate updated successfully");
                    await loadCandidates();
                } else {
                    await handleBackendError(res, alertEl);
                }
            } catch (networkError) {
                showModalAlert(alertEl, networkError.message || "Network request failed");
            } finally {
                setSubmittingState(submitBtn, cancelBtn, "editCandidateModal", false, "Save Changes");
            }
        });
    }

    // 5. Delete Candidate Submit
    const deleteBtn = document.getElementById("deleteCandidateSubmitBtn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
            if (isSubmitting || !deletingCandidateId) return;

            const alertEl = document.getElementById("deleteModalAlert");
            const cancelBtn = document.getElementById("deleteCandidateCancelBtn");

            hideModalAlert(alertEl);
            setSubmittingState(deleteBtn, cancelBtn, "deleteCandidateModal", true, "Delete Candidate");

            try {
                const res = await apiFetch(`/api/admin/candidates/${deletingCandidateId}`, {
                    method: "DELETE"
                });

                if (res.ok) {
                    const modalEl = document.getElementById("deleteCandidateModal");
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) modalInstance.hide();

                    showToast("Candidate removed successfully");
                    await loadCandidates();
                } else {
                    await handleBackendError(res, alertEl);
                }
            } catch (networkError) {
                showModalAlert(alertEl, networkError.message || "Network request failed");
            } finally {
                setSubmittingState(deleteBtn, cancelBtn, "deleteCandidateModal", false, "Delete Candidate");
            }
        });
    }
});
