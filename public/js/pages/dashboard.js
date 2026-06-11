import { requireAdmin, signOut } from '/js/auth.js';
import { toast, showSkeletons, showEmpty, showError, setButtonLoading } from '/js/core.js';
import { renderPagination } from '/js/components/pagination.js';
import {
    fetchPrompts,
    adminCreatePrompt,
    adminUpdatePrompt,
    adminDeletePrompt,
    adminUploadImage,
    fetchAdminSubmissions,
    updateSubmissionStatus,
    fetchAdminUsers,
    fetchAdminAnalytics,
    fetchCategories,
    fetchTools
} from '/js/api.js';

// ---- DOM refs ----
const tableBody     = document.getElementById('prompts-table-body');
const pagEl         = document.getElementById('admin-pagination');
const adminSearch   = document.getElementById('admin-search');
const createBtn     = document.getElementById('create-btn');
const modal         = document.getElementById('prompt-modal');
const modalTitle    = document.getElementById('modal-title');
const form          = document.getElementById('prompt-form');
const formSubmitBtn = document.getElementById('form-submit');
const modalClose    = document.getElementById('modal-close');
const modalCancel   = document.getElementById('modal-cancel');

// Form fields
const fId        = document.getElementById('form-id');
const fTitle     = document.getElementById('form-title');
const fDesc      = document.getElementById('form-description');
const fPrompt    = document.getElementById('form-prompt-text');
const fNeg       = document.getElementById('form-negative-prompt');
const fDiff      = document.getElementById('form-difficulty');
const fType      = document.getElementById('form-type');
const fStatus    = document.getElementById('form-status');
const fTags      = document.getElementById('form-tags');
const fImageUrl  = document.getElementById('form-image-url');
const fImageFile = document.getElementById('form-image-file');
const uploadBtn  = document.getElementById('upload-image-btn');
const preview    = document.getElementById('upload-preview');
const previewImg = document.getElementById('preview-img');

let state = { q: '', page: 1, limit: 12 };
let editingId = null;
let categories = [];
let currentSection = 'prompts';

// ---- Auth guard (Moved to init) ----

// ---- Load categories ----
const loadCategories = async () => {
    try {
        const res = await fetchCategories();
        categories = res?.data || [];
    } catch {  }
};

// ---- Load prompts (admin sees ALL statuses) ----
const loadPrompts = async () => {
    tableBody.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">Loading...</div>`;
    pagEl.innerHTML = '';

    try {
        // Admins use supabaseAdmin on backend so we pass status=all signal via a custom param
        // The backend admin route can handle status overrides; for now we pass without status filter
        const res = await fetch(`/api/admin/prompts?page=${state.page}&limit=${state.limit}${state.q ? `&q=${encodeURIComponent(state.q)}` : ''}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('sb_access_token')}` }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Failed to load');

        const prompts = json.data || [];
        const meta    = json.metadata || {};

        // Update stats
        document.getElementById('stat-total').textContent     = meta.total ?? '—';
        document.getElementById('stat-published').textContent = prompts.filter(p => p.status === 'published').length;
        document.getElementById('stat-draft').textContent     = prompts.filter(p => p.status === 'draft').length;
        document.getElementById('stat-archived').textContent  = prompts.filter(p => p.status === 'archived').length;

        if (prompts.length === 0) {
            tableBody.innerHTML = `<div style="padding:3rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">No prompts found.</div>`;
            return;
        }

        tableBody.innerHTML = prompts.map(p => `
            <div class="table-row-item">
                <div>
                    <div style="font-size:0.875rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;">${p.title}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">${p.slug}</div>
                </div>
                <div><span class="badge badge-${p.status}">${p.status}</span></div>
                <div style="font-size:0.875rem;color:var(--text-muted);">${p.copy_count || 0}</div>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <button class="btn btn-secondary btn-sm edit-btn" data-id="${p.id}">Edit</button>
                    <button class="btn btn-danger btn-sm archive-btn" data-id="${p.id}" ${p.status === 'archived' ? 'disabled' : ''}>Archive</button>
                </div>
            </div>
        `).join('');

        // Attach actions
        tableBody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEdit(prompts.find(p => p.id === btn.dataset.id)));
        });
        tableBody.querySelectorAll('.archive-btn').forEach(btn => {
            btn.addEventListener('click', () => archivePrompt(btn.dataset.id, btn));
        });

        renderPagination(pagEl, meta, (p) => { state.page = p; loadPrompts(); });
    } catch (err) {
        tableBody.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171;font-size:0.875rem;">${err.message}</div>`;
        toast.error(err.message);
    }
};

// ---- Archive ----
const archivePrompt = async (id, btn) => {
    if (!confirm('Archive this prompt? It will be hidden from public.')) return;
    const restore = setButtonLoading(btn, 'Archiving...');
    try {
        await adminDeletePrompt(id);
        toast.success('Prompt archived.');
        loadPrompts();
    } catch (err) {
        toast.error(err.message);
        restore();
    }
};

// ---- Modal open/close ----
const openCreate = () => {
    editingId = null;
    modalTitle.textContent = 'New Prompt';
    form.reset();
    fId.value = '';
    preview.style.display = 'none';
    modal.style.display = 'flex';
    fTitle.focus();
};

const openEdit = (prompt) => {
    editingId = prompt.id;
    modalTitle.textContent = 'Edit Prompt';
    fId.value          = prompt.id;
    fTitle.value       = prompt.title || '';
    fDesc.value        = prompt.description || '';
    fPrompt.value      = prompt.prompt_text || '';
    fNeg.value         = prompt.negative_prompt || '';
    fDiff.value        = prompt.difficulty || 'intermediate';
    fType.value        = prompt.prompt_type || 'text-to-image';
    fStatus.value      = prompt.status || 'published';
    fTags.value        = (prompt.tags || []).join(', ');
    fImageUrl.value    = prompt.preview_image_url || '';

    if (prompt.preview_image_url) {
        previewImg.src = prompt.preview_image_url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    modal.style.display = 'flex';
    fTitle.focus();
};

const closeModal = () => {
    modal.style.display = 'none';
    form.reset();
    editingId = null;
};

createBtn.addEventListener('click', openCreate);
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// ---- Image upload ----
uploadBtn.addEventListener('click', () => fImageFile.click());
fImageFile.addEventListener('change', async () => {
    const file = fImageFile.files[0];
    if (!file) return;
    const restore = setButtonLoading(uploadBtn, 'Uploading...');
    try {
        const res = await adminUploadImage(file);
        fImageUrl.value = res.url;
        previewImg.src = res.url;
        preview.style.display = 'block';
        toast.success('Image uploaded!');
    } catch (err) {
        toast.error(`Upload failed: ${err.message}`);
    } finally {
        restore();
        fImageFile.value = '';
    }
});

fImageUrl.addEventListener('input', () => {
    const url = fImageUrl.value.trim();
    if (url) {
        previewImg.src = url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});

// ---- Form submit ----
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title   = fTitle.value.trim();
    const pText   = fPrompt.value.trim();
    if (!title || !pText) {
        toast.warning('Title and Prompt Text are required.');
        return;
    }

    const payload = {
        title,
        description:      fDesc.value.trim() || undefined,
        prompt_text:      pText,
        negative_prompt:  fNeg.value.trim() || undefined,
        difficulty:       fDiff.value,
        prompt_type:      fType.value,
        status:           fStatus.value,
        tags:             fTags.value ? fTags.value.split(',').map(t => t.trim()).filter(Boolean) : [],
        preview_image_url: fImageUrl.value.trim() || undefined,
    };

    const restore = setButtonLoading(formSubmitBtn, 'Saving...');

    try {
        if (editingId) {
            await adminUpdatePrompt(editingId, payload);
            toast.success('Prompt updated!');
        } else {
            await adminCreatePrompt(payload);
            toast.success('Prompt created!');
        }
        closeModal();
        loadPrompts();
    } catch (err) {
        toast.error(`Save failed: ${err.message}`);
        restore();
    }
});

// ---- Search ----
let searchTimer;
adminSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.q    = adminSearch.value.trim();
        state.page = 1;
        loadPrompts();
    }, 350);
});

// ---- Load Submissions ----
const loadSubmissions = async () => {
    const subTableBody = document.getElementById('submissions-table-body');
    subTableBody.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">Loading...</div>`;
    
    try {
        const res = await fetchAdminSubmissions();
        const subs = res.data || [];
        
        if (subs.length === 0) {
            subTableBody.innerHTML = `<div style="padding:3rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">No submissions found.</div>`;
            return;
        }

        subTableBody.innerHTML = subs.map(s => `
            <div class="table-row-item">
                <div>
                    <div style="font-size:0.875rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;" title="${s.title}">${s.title}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;max-height:3em;overflow:hidden;text-overflow:ellipsis;" title="${s.prompt_text}">${s.prompt_text.substring(0, 50)}...</div>
                </div>
                <div><span class="badge badge-${s.status}">${s.status}</span></div>
                <div style="font-size:0.875rem;color:var(--text-muted);">${new Date(s.created_at).toLocaleDateString()}</div>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    ${s.status === 'pending' ? `
                        <button class="btn btn-primary btn-sm approve-btn" data-id="${s.id}">Approve</button>
                        <button class="btn btn-danger btn-sm reject-btn" data-id="${s.id}">Reject</button>
                    ` : `
                        <span style="font-size:0.8rem;color:var(--text-muted)">${s.rejection_reason || ''}</span>
                    `}
                </div>
            </div>
        `).join('');

        subTableBody.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('Approve and publish this submission?')) return;
                const restore = setButtonLoading(btn, '...');
                try {
                    await updateSubmissionStatus(btn.dataset.id, 'approved');
                    toast.success('Submission approved and published!');
                    loadSubmissions();
                } catch (e) {
                    toast.error(e.message);
                    restore();
                }
            });
        });

        subTableBody.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rejectionModal  = document.getElementById('rejection-modal');
                const reasonInput     = document.getElementById('rejection-reason-input');
                const confirmBtn      = document.getElementById('rejection-confirm-btn');
                const cancelBtn       = document.getElementById('rejection-cancel-btn');
                const closeBtn        = document.getElementById('rejection-modal-close');

                reasonInput.value = '';
                rejectionModal.style.display = 'flex';
                setTimeout(() => reasonInput.focus(), 50);

                const cleanup = () => { rejectionModal.style.display = 'none'; };

                const doReject = async () => {
                    const reason = reasonInput.value.trim();
                    cleanup();
                    const restore = setButtonLoading(btn, '...');
                    try {
                        await updateSubmissionStatus(btn.dataset.id, 'rejected', reason);
                        toast.success('Submission rejected.');
                        loadSubmissions();
                    } catch (e) {
                        toast.error(e.message);
                        restore();
                    }
                };

                // One-time listeners — clone to remove previous handlers
                const newConfirm = confirmBtn.cloneNode(true);
                const newCancel  = cancelBtn.cloneNode(true);
                const newClose   = closeBtn.cloneNode(true);
                confirmBtn.replaceWith(newConfirm);
                cancelBtn.replaceWith(newCancel);
                closeBtn.replaceWith(newClose);

                newConfirm.addEventListener('click', doReject);
                newCancel.addEventListener('click', cleanup);
                newClose.addEventListener('click', cleanup);
                rejectionModal.addEventListener('click', (e) => { if (e.target === rejectionModal) cleanup(); }, { once: true });
            });
        });
    } catch (e) {
        subTableBody.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171;font-size:0.875rem;">${e.message}</div>`;
        toast.error(e.message);
    }
};

// ---- Load Users ----
const loadUsers = async () => {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">Loading...</div>`;
    try {
        const res = await fetchAdminUsers();
        if (!res.data || res.data.length === 0) {
            tableBody.innerHTML = `<div style="padding:3rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">No users found.</div>`;
            return;
        }
        tableBody.innerHTML = res.data.map(u => `
            <div class="table-row-item" style="grid-template-columns: 1fr 100px 140px;">
                <div><div style="font-size:0.875rem;font-weight:600;color:var(--text);">${u.email}</div></div>
                <div><span class="badge badge-${u.role === 'admin' ? 'advanced' : 'beginner'}">${u.role}</span></div>
                <div style="font-size:0.875rem;color:var(--text-muted);">${new Date(u.created_at).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (e) {
        tableBody.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171;font-size:0.875rem;">${e.message}</div>`;
    }
};

// ---- Load Categories (Admin View) ----
const loadAdminCategories = async () => {
    const tableBody = document.getElementById('categories-table-body');
    if (categories.length === 0) {
        tableBody.innerHTML = `<div style="padding:3rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">No categories found.</div>`;
        return;
    }
    tableBody.innerHTML = categories.map(c => `
        <div class="table-row-item" style="grid-template-columns: 80px 1fr 140px;">
            <div style="font-size:1.25rem;">${c.icon || '📁'}</div>
            <div style="font-size:0.875rem;font-weight:600;color:var(--text);">${c.name}</div>
            <div style="font-size:0.875rem;color:var(--text-muted);">${c.slug}</div>
        </div>
    `).join('');
};

// ---- Load Tools ----
let toolsCache = [];

const loadTools = async () => {
    const tableBody = document.getElementById('tools-table-body');
    tableBody.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">Loading...</div>`;

    try {
        const res = await fetch('/api/prompts/discovery/tools');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load tools');

        toolsCache = json.data || [];

        if (toolsCache.length === 0) {
            tableBody.innerHTML = `<div style="padding:3rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">No tools found.</div>`;
            return;
        }

        tableBody.innerHTML = toolsCache.map(t => {
            const logo = t.logo_url 
                ? `<img src="${t.logo_url}" style="width:30px;height:30px;object-fit:contain;border-radius:4px;background:var(--bg-3);">` 
                : `<span style="font-size:1.2rem;">🤖</span>`;
            return `
                <div class="table-row-item" style="grid-template-columns: 80px 1fr 140px 140px;">
                    <div>${logo}</div>
                    <div style="font-size:0.875rem;font-weight:600;color:var(--text);">${t.name}</div>
                    <div style="font-size:0.875rem;color:var(--text-muted);">${t.slug}</div>
                    <div style="display:flex;align-items:center;gap:0.5rem;">
                        <button class="btn btn-secondary btn-sm edit-tool-btn" data-id="${t.id}">Edit</button>
                        <button class="btn btn-danger btn-sm delete-tool-btn" data-id="${t.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners
        tableBody.querySelectorAll('.edit-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditTool(toolsCache.find(t => t.id === btn.dataset.id)));
        });
        tableBody.querySelectorAll('.delete-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteTool(btn.dataset.id, btn));
        });
    } catch (err) {
        tableBody.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171;font-size:0.875rem;">${err.message}</div>`;
    }
};

const openCreateTool = () => {
    const modal = document.getElementById('tool-modal');
    const form = document.getElementById('tool-form');
    document.getElementById('tool-modal-title').textContent = 'New Tool';
    form.reset();
    document.getElementById('tool-form-id').value = '';
    document.getElementById('tool-logo-preview').style.display = 'none';
    modal.style.display = 'flex';
    document.getElementById('tool-form-name').focus();
};

const openEditTool = (tool) => {
    const modal = document.getElementById('tool-modal');
    document.getElementById('tool-modal-title').textContent = 'Edit Tool';
    document.getElementById('tool-form-id').value = tool.id;
    document.getElementById('tool-form-name').value = tool.name;
    document.getElementById('tool-form-logo-url').value = tool.logo_url || '';
    if (tool.logo_url) {
        document.getElementById('tool-preview-img').src = tool.logo_url;
        document.getElementById('tool-logo-preview').style.display = 'block';
    } else {
        document.getElementById('tool-logo-preview').style.display = 'none';
    }
    modal.style.display = 'flex';
    document.getElementById('tool-form-name').focus();
};

const closeToolModal = () => {
    document.getElementById('tool-modal').style.display = 'none';
    document.getElementById('tool-form').reset();
};

const deleteTool = async (id, btn) => {
    if (!confirm('Are you sure you want to delete this tool?')) return;
    const restore = setButtonLoading(btn, '...');
    try {
        const res = await fetch(`/api/admin/tools/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('sb_access_token')}` }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to delete');
        toast.success('Tool deleted successfully!');
        loadTools();
    } catch (err) {
        toast.error(err.message);
        restore();
    }
};

// Tool logo upload
document.getElementById('tool-upload-logo-btn')?.addEventListener('click', () => document.getElementById('tool-form-logo-file').click());
document.getElementById('tool-form-logo-file')?.addEventListener('change', async () => {
    const file = document.getElementById('tool-form-logo-file').files[0];
    if (!file) return;
    const uploadBtn = document.getElementById('tool-upload-logo-btn');
    const restore = setButtonLoading(uploadBtn, '...');
    try {
        const res = await adminUploadImage(file);
        document.getElementById('tool-form-logo-url').value = res.url;
        document.getElementById('tool-preview-img').src = res.url;
        document.getElementById('tool-logo-preview').style.display = 'block';
        toast.success('Logo uploaded!');
    } catch (err) {
        toast.error(`Upload failed: ${err.message}`);
    } finally {
        restore();
        document.getElementById('tool-form-logo-file').value = '';
    }
});

document.getElementById('tool-form-logo-url')?.addEventListener('input', () => {
    const url = document.getElementById('tool-form-logo-url').value.trim();
    const preview = document.getElementById('tool-logo-preview');
    const img = document.getElementById('tool-preview-img');
    if (url) {
        img.src = url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});

// Tool form submit
document.getElementById('tool-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('tool-form-name').value.trim();
    const logo_url = document.getElementById('tool-form-logo-url').value.trim();
    if (!name) return toast.warning('Tool name is required.');

    const submitBtn = document.getElementById('tool-form-submit');
    const restore = setButtonLoading(submitBtn, 'Saving...');
    const id = document.getElementById('tool-form-id').value;

    const payload = { name, logo_url: logo_url || undefined };

    try {
        const url = id ? `/api/admin/tools/${id}` : '/api/admin/tools';
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('sb_access_token')}`
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to save');

        toast.success(id ? 'Tool updated!' : 'Tool created!');
        closeToolModal();
        loadTools();
    } catch (err) {
        toast.error(err.message);
        restore();
    }
});

// Close modal when clicking background
document.getElementById('tool-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('tool-modal')) closeToolModal();
});
document.getElementById('tool-modal-close')?.addEventListener('click', closeToolModal);
document.getElementById('tool-modal-cancel')?.addEventListener('click', closeToolModal);
document.getElementById('create-tool-btn')?.addEventListener('click', openCreateTool);


// ---- Load Analytics ----
const loadAnalytics = async () => {
    const grid = document.getElementById('analytics-grid');
    grid.innerHTML = `<div style="grid-column:1/-1;padding:2rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">Loading analytics...</div>`;
    try {
        const res = await fetchAdminAnalytics();
        const d = res.data || {};
        grid.innerHTML = `
            <div class="stat-card">
                <div class="stat-value" style="color:#a78bfa;">${d.total_prompts || 0}</div>
                <div class="stat-label">Total Prompts</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:#f43f5e;">${d.total_collections || 0}</div>
                <div class="stat-label">Total Collections</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:#4ade80;">${d.total_users || 0}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:#fb923c;">${d.total_submissions || 0}</div>
                <div class="stat-label">Pending Submissions</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:#38bdf8;">${d.total_views || 0}</div>
                <div class="stat-label">Total Views</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:#c084fc;">${d.total_copies || 0}</div>
                <div class="stat-label">Total Copies</div>
            </div>
        `;
    } catch (e) {
        grid.innerHTML = `<div style="grid-column:1/-1;padding:2rem;text-align:center;color:#f87171;font-size:0.875rem;">${e.message}</div>`;
    }
};

// ---- Tab Switching ----
document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-link[data-section]').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.dashboard-section').forEach(s => s.style.display = 'none');
        
        link.classList.add('active');
        currentSection = link.dataset.section;
        document.getElementById(`section-${currentSection}`).style.display = 'block';
        
        if (currentSection === 'prompts') loadPrompts();
        else if (currentSection === 'submissions') loadSubmissions();
        else if (currentSection === 'users') loadUsers();
        else if (currentSection === 'categories') loadAdminCategories();
        else if (currentSection === 'tools') loadTools();
        else if (currentSection === 'analytics') loadAnalytics();
    });
});

// ---- Init ----
const initDashboard = async () => {
    try {
        const user = await requireAdmin('/login.html').catch(err => {
            console.error('Auth error:', err);
            window.location.href = '/user-dashboard.html';
            return null;
        });

        if (!user) {
            console.error('Unauthorized or missing role. Redirecting...');
            return;
        }

        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) userEmailEl.textContent = user.email;

        document.getElementById('logout-btn').addEventListener('click', async () => {
            await signOut();
            window.location.href = '/login.html';
        });

        document.title = 'Admin Dashboard — PromptForge';
        await loadCategories();
        loadPrompts();
    } catch (err) {
        console.error('Dashboard init failed:', err);
    }
};

initDashboard();
