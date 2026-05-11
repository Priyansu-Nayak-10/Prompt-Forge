import { requireAdmin, signOut } from '../auth.js';
import { toast } from '../toast.js';
import { showSkeletons, showEmpty, showError, setButtonLoading } from '../ui.js';
import { renderPagination } from '../components/pagination.js';
import {
    fetchPrompts,
    adminCreatePrompt,
    adminUpdatePrompt,
    adminDeletePrompt,
    adminUploadImage,
    fetchCategories,
} from '../api.js';

// ---- Auth guard ----
const user = await requireAdmin('/login.html');
if (!user) throw new Error('Not authorized');

document.getElementById('user-email').textContent = user.email;

document.getElementById('logout-btn').addEventListener('click', async () => {
    await signOut();
    window.location.href = '/login.html';
});

// ---- State ----
let state = { q: '', page: 1, limit: 12 };
let editingId = null;
let categories = [];

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

// ---- Load categories ----
const loadCategories = async () => {
    try {
        const res = await fetchCategories();
        categories = res?.data || [];
    } catch { /* non-fatal */ }
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

// ---- Init ----
await loadCategories();
loadPrompts();
