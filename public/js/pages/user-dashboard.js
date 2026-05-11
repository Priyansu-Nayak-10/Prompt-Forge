import { requireAuth, signOut } from '/js/auth.js';
import { fetchSavedPrompts, fetchUserSubmissions } from '/js/api.js';
import { promptCardHTML, attachCopyHandlers, attachSaveHandlers } from '/js/components/promptCard.js';
import { toast } from '/js/core.js';

let user = null;

const init = async () => {
    document.title = 'User Dashboard — PromptForge';
    user = await requireAuth();
    if (!user) return;

    // Set user info
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('account-email').value = user.email;
    document.getElementById('account-id').value = user.id;

    // Logout handler
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut();
        window.location.href = '/login.html';
    });

    // Tab handling
    const tabs = document.querySelectorAll('.sidebar-link[data-tab]');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // Load initial data
    loadBookmarks();
    loadSubmissions();
};

const loadBookmarks = async () => {
    const container = document.getElementById('bookmarks-container');
    try {
        const res = await fetchSavedPrompts();
        if (!res.data || res.data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No saved prompts yet</h3>
                    <p>Explore the platform and save your favorite prompts to see them here.</p>
                    <a href="/prompts.html" class="btn btn-secondary">Explore Prompts</a>
                </div>
            `;
            return;
        }

        container.innerHTML = `<div class="prompt-grid">${res.data.map(p => promptCardHTML({...p, isSaved: true})).join('')}</div>`;
        attachCopyHandlers(container);
        attachSaveHandlers(container);
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h3>Error loading bookmarks</h3><p>${err.message}</p></div>`;
    }
};

const loadSubmissions = async () => {
    const container = document.getElementById('submissions-container');
    // TODO: Implement actual fetch once backend API is ready in Phase 4
    // For now, show empty state
    container.innerHTML = `
        <div style="padding: 2rem; text-align: center; border-bottom: 1px solid var(--border);">
            <p style="color:var(--text-muted);margin-bottom:1rem;">You haven't submitted any prompts yet.</p>
            <a href="/submit.html" class="btn btn-secondary" style="display:inline-block;">Submit your first prompt</a>
        </div>
    `;
};

document.addEventListener('DOMContentLoaded', init);
