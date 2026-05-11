import { fetchPrompts, fetchSavedPromptIds } from '/js/api.js';
import { promptCardHTML, attachCopyHandlers, attachSaveHandlers } from '/js/components/promptCard.js';
import { isAuthenticated } from '/js/auth.js';

document.title = 'PromptForge — AI Prompt Discovery Platform';

const grid = document.getElementById('trending-prompts-grid');
if (!grid) throw new Error('No grid element');

// ─── Live Hero Stats ───────────────────────────────────────────────────────────
const loadStats = async () => {
    try {
        const res  = await fetch('/api/stats');
        const json = await res.json();
        if (!json.success) return;
        const { prompts, users, categories } = json.data;

        const promptsEl    = document.getElementById('stat-num-prompts');
        const usersEl      = document.getElementById('stat-num-users');
        const categoriesEl = document.getElementById('stat-num-categories');

        if (promptsEl)    promptsEl.textContent    = prompts    > 999 ? `${Math.floor(prompts/1000)}K+` : `${prompts}+`;
        if (usersEl)      usersEl.textContent      = users      > 999 ? `${Math.floor(users/1000)}K+`   : `${users}+`;
        if (categoriesEl) categoriesEl.textContent = `${categories}+`;
    } catch { /* non-fatal */ }
};

loadStats();

// ─── Trending Prompts Grid ─────────────────────────────────────────────────────
grid.innerHTML = Array(4).fill(`
  <div class="prompt-card" style="pointer-events:none;">
    <div class="card-image"><div class="skeleton" style="width:100%;height:100%;"></div></div>
    <div class="card-body" style="gap:0.75rem;">
      <div class="skeleton" style="height:16px;width:75%;"></div>
      <div class="skeleton" style="height:12px;width:100%;"></div>
      <div class="skeleton" style="height:12px;width:60%;"></div>
    </div>
  </div>
`).join('');

try {
    const res = await fetchPrompts({ sort: 'trending', limit: 4 });
    const prompts = res.data || [];

    if (!prompts.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted)">No trending prompts yet.</div>`;
    } else {
        let savedIds = [];
        if (await isAuthenticated()) {
            try {
                const saveRes = await fetchSavedPromptIds();
                if (saveRes.success) savedIds = saveRes.data || [];
            } catch { /* non-fatal */ }
        }

        grid.innerHTML = prompts.map(p => promptCardHTML({ ...p, isSaved: savedIds.includes(p.id) })).join('');
        attachCopyHandlers(grid);
        attachSaveHandlers(grid);
    }
} catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171">${err.message}</div>`;
}
