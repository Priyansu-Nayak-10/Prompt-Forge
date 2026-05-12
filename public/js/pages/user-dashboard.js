import { requireAuth, signOut } from '/js/auth.js';
import { fetchUserSubmissions, updateUserProfile, uploadUserAvatar, fetchUserProfile } from '/js/api.js';
import { promptCardHTML, attachCopyHandlers } from '/js/components/promptCard.js';
import { toast } from '/js/core.js';

const clean = (str) => {
    if (!str) return '';
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(str);
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};


// ─── Auth Guard (Moved to Init) ───────────────────────────────────────────────────────────────

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

        if (tab === 'collections' && !collectionsLoaded) loadCollections();
        if (tab === 'submissions' && !submissionsLoaded) loadSubmissions();
        if (tab === 'account') loadAccount();
    });
});


// ─── Collections ────────────────────────────────────────────────────────────────
import { fetchCollections, fetchCollectionPrompts, toggleCollectionPrompt } from '/js/api.js';

let collectionsLoaded = false;

const loadCollections = async () => {
    const container = document.getElementById('collections-container');
    if (!container) return;
    collectionsLoaded = true;

    container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:1.5rem;" id="collections-grid">
      <div class="skeleton skeleton-card" style="height:140px;"></div>
      <div class="skeleton skeleton-card" style="height:140px;"></div>
    </div>`;

    try {
        const res = await fetchCollections();
        const collections = res.data || [];

        if (!collections.length) {
            container.innerHTML = `
              <div class="empty-state">
                <div style="font-size:2.5rem;margin-bottom:1rem;">📁</div>
                <h3>No collections yet</h3>
                <p>Browse prompts and click "Save" to create your first collection.</p>
                <a href="/prompts.html" class="btn btn-primary">Explore Prompts</a>
              </div>`;
            return;
        }

        // Render collection folders
        container.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:1.5rem;">
          ${collections.map(col => `
            <div class="prompt-card" style="padding:1.5rem;display:flex;flex-direction:column;cursor:pointer;" data-col-id="${col.id}">
              <div style="font-size:2rem;margin-bottom:0.75rem;">📁</div>
              <h3 style="font-size:1.125rem;font-weight:700;margin-bottom:0.25rem;">${clean(col.name)}</h3>
              <p style="color:var(--text-muted);font-size:0.875rem;">${col.prompt_count} prompts</p>
            </div>
          `).join('')}
        </div>`;

        // Add click handler to view prompts inside a collection
        container.querySelectorAll('[data-col-id]').forEach(card => {
            card.addEventListener('click', () => loadCollectionDetail(card.dataset.colId, card.querySelector('h3').textContent));
        });

    } catch (err) {
        container.innerHTML = `<p style="color:#f87171;padding:2rem;">Failed to load collections: ${err.message}</p>`;
    }
};

const loadCollectionDetail = async (collectionId, collectionName) => {
    const container = document.getElementById('collections-container');
    
    // Breadcrumb and Title
    container.innerHTML = `
      <div style="margin-bottom:1.5rem;">
         <button class="btn btn-secondary btn-sm" id="back-to-collections" style="margin-bottom:1rem;">← Back to Collections</button>
         <h2 style="font-size:1.5rem;font-weight:700;">${clean(collectionName)}</h2>
      </div>
      <div class="prompt-grid">
        ${Array(3).fill('<div class="skeleton skeleton-card"></div>').join('')}
      </div>
    `;

    document.getElementById('back-to-collections').addEventListener('click', loadCollections);

    try {
        const res = await fetchCollectionPrompts(collectionId);
        const prompts = res.data || [];

        const grid = container.querySelector('.prompt-grid');

        if (!prompts.length) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);background:var(--bg-2);border-radius:var(--radius-lg);">This collection is empty.</div>`;
            return;
        }

        grid.innerHTML = prompts.map(p => promptCardHTML({ ...p, isSaved: true })).join('');
        attachCopyHandlers(grid);

        // Allow removing from collection
        grid.addEventListener('click', async (e) => {
            const btn = e.target.closest('[data-save-prompt-id]');
            if (!btn) return;
            const promptId = btn.dataset.savePromptId;
            btn.disabled = true;
            try {
                await toggleCollectionPrompt(collectionId, promptId);
                btn.closest('.prompt-card')?.remove();
            } catch {
                btn.disabled = false;
            }
        });

    } catch (err) {
        container.querySelector('.prompt-grid').innerHTML = `<p style="color:#f87171;padding:2rem;grid-column:1/-1;">Failed to load prompts: ${err.message}</p>`;
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
const loadAccount = async () => {
    const emailInput = document.getElementById('account-email');
    const idInput    = document.getElementById('account-id');
    const nameInput  = document.getElementById('profile-display-name');
    const avatarInput = document.getElementById('profile-avatar-url');
    
    const previewAvatar = document.getElementById('profile-preview-avatar');
    const previewName   = document.getElementById('profile-preview-name');
    const previewRole   = document.getElementById('profile-preview-role');

    try {
        const res = await fetchUserProfile();
        const user = res.data;
        
        if (user) {
            if (emailInput) emailInput.value = user.email || '';
            if (idInput)    idInput.value    = user.id     || '';
            if (nameInput)  nameInput.value  = user.display_name || '';
            if (avatarInput) avatarInput.value = user.avatar_url || '';
            
            if (previewName) previewName.textContent = user.display_name || 'Anonymous';
            if (previewRole) previewRole.textContent = user.role || 'User';
            
            if (previewAvatar) {
                if (user.avatar_url) {
                    previewAvatar.innerHTML = `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`;
                } else {
                    previewAvatar.innerHTML = '👤';
                }
            }
        }
    } catch (err) {
        console.error('Failed to load profile', err);
    }
};

// Profile Form Listeners
document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-profile-btn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        const display_name = document.getElementById('profile-display-name').value;
        const avatar_url   = document.getElementById('profile-avatar-url').value;
        
        await updateUserProfile({ display_name, avatar_url });
        toast.success('Profile updated successfully!');
        loadAccount(); // Refresh preview
    } catch (err) {
        toast.error(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
});

document.getElementById('avatar-file')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        toast.info('Uploading avatar...');
        const res = await uploadUserAvatar(file);
        document.getElementById('profile-avatar-url').value = res.url;
        loadAccount(); // Refresh preview
        toast.success('Avatar uploaded!');
    } catch (err) {
        toast.error(err.message);
    }
});


// ─── Init ──────────────────────────────────────────────────
const initUserDashboard = async () => {
    try {
        const user = await requireAuth('/login.html');
        if (!user) {
            console.error('Auth redirect');
            return;
        }

        // Show email in sidebar
        const emailEl = document.getElementById('user-email');
        if (emailEl) emailEl.textContent = user.email;

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await signOut();
            window.location.href = '/';
        });

        // Save user to window so tabs can access it
        window.currentUser = user;

        loadCollections();
    } catch (err) {
        console.error('Failed to init user dashboard', err);
    }
};

initUserDashboard();
