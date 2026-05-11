import { requireAuth, signOut } from '/js/auth.js';
import { fetchSavedPrompts, fetchUserSubmissions, toggleSave } from '/js/api.js';
import { promptCardHTML, attachCopyHandlers } from '/js/components/promptCard.js';

// ─── Auth Guard ───────────────────────────────────────────────────────────────
const user = await requireAuth('/login.html');
if (!user) throw new Error('Auth redirect');

// Show email in sidebar
const emailEl = document.getElementById('user-email');
if (emailEl) emailEl.textContent = user.email;

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await signOut();
    window.location.href = '/';
});

// ─── Tab Navigation ───────────────────────────────────────────────────────────
const sidebarLinks = document.querySelectorAll('.sidebar-link[data-tab]');
const tabContents  = document.querySelectorAll('.tab-content');

sidebarLinks.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        sidebarLinks.forEach(l => l.classList.remove('active'));
        tabContents.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${tab}`)?.classList.add('active');

        if (tab === 'bookmarks' && !bookmarksLoaded) loadBookmarks();
        if (tab === 'submissions' && !submissionsLoaded) loadSubmissions();
        if (tab === 'account') loadAccount();
    });
});

// ─── Bookmarks ────────────────────────────────────────────────────────────────
let bookmarksLoaded = false;

const loadBookmarks = async () => {
    const container = document.getElementById('bookmarks-container');
    if (!container) return;
    bookmarksLoaded = true;

    container.innerHTML = `<div class="prompt-grid">${Array(3).fill('<div class="skeleton skeleton-card"></div>').join('')}</div>`;

    try {
        const res = await fetchSavedPrompts();
        const prompts = res.data || [];

        if (!prompts.length) {
            container.innerHTML = `
              <div class="empty-state">
                <div style="font-size:2.5rem;margin-bottom:1rem;">🔖</div>
                <h3>No saved prompts yet</h3>
                <p>Browse prompts and click the bookmark icon to save them here.</p>
                <a href="/prompts.html" class="btn btn-primary">Explore Prompts</a>
              </div>`;
            return;
        }

        container.innerHTML = `<div class="prompt-grid">
          ${prompts.map(p => promptCardHTML({ ...p, isSaved: true })).join('')}
        </div>`;
        attachCopyHandlers(container);

        // Handle unsave from dashboard
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-save-id]');
            if (!btn) return;
            const promptId = btn.dataset.saveId;
            btn.disabled = true;
            try {
                await toggleSave(promptId);
                btn.closest('.prompt-card')?.remove();
                if (!container.querySelector('.prompt-card')) loadBookmarks();
            } catch {
                btn.disabled = false;
            }
        });
    } catch (err) {
        container.innerHTML = `<p style="color:#f87171;padding:2rem;">Failed to load bookmarks: ${err.message}</p>`;
    }
};

// ─── Submissions ──────────────────────────────────────────────────────────────
let submissionsLoaded = false;

const STATUS_STYLES = {
    pending:  { cls: 'badge-pending',  label: 'Pending Review' },
    approved: { cls: 'badge-published', label: 'Approved' },
    rejected: { cls: 'badge-archived',  label: 'Rejected' },
};

const loadSubmissions = async () => {
    const container = document.getElementById('submissions-container');
    if (!container) return;
    submissionsLoaded = true;

    container.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--text-muted);">Loading…</div>`;

    try {
        const res = await fetchUserSubmissions();
        const subs = res.data || [];

        if (!subs.length) {
            container.innerHTML = `
              <div style="padding:2rem;text-align:center;color:var(--text-muted);">
                <div style="font-size:2rem;margin-bottom:0.75rem;">📝</div>
                <p style="margin-bottom:1rem;">You haven't submitted any prompts yet.</p>
                <a href="/submit.html" class="btn btn-primary btn-sm">Submit Your First Prompt</a>
              </div>`;
            return;
        }

        container.innerHTML = subs.map(sub => {
            const st = STATUS_STYLES[sub.status] || STATUS_STYLES.pending;
            const date = new Date(sub.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const rejectionHtml = sub.rejection_reason
                ? `<div style="grid-column:1/-1;font-size:0.78rem;color:#f87171;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:var(--radius-sm);padding:0.5rem 0.75rem;margin-top:0.25rem;">
                     <strong>Reason:</strong> ${sub.rejection_reason}
                   </div>`
                : '';
            return `
              <div class="table-row-item" style="${sub.status === 'rejected' ? 'grid-template-columns: 1fr; flex-direction: column;' : ''}">
                <div>
                  <div style="font-weight:600;font-size:0.875rem;">${sub.title || 'Untitled'}</div>
                  ${sub.description ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem;">${sub.description}</div>` : ''}
                  ${rejectionHtml}
                </div>
                <span class="badge ${st.cls}">${st.label}</span>
                <span style="font-size:0.78rem;color:var(--text-muted);">${date}</span>
              </div>`;
        }).join('');
    } catch (err) {
        container.innerHTML = `<p style="color:#f87171;padding:1.5rem;">Failed to load submissions: ${err.message}</p>`;
    }
};

// ─── Account Settings ─────────────────────────────────────────────────────────
const loadAccount = () => {
    const emailInput = document.getElementById('account-email');
    const idInput    = document.getElementById('account-id');
    if (emailInput) emailInput.value = user.email || '';
    if (idInput)    idInput.value    = user.id     || '';
};

// ─── Init — load default tab ──────────────────────────────────────────────────
loadBookmarks();
