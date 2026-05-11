import { fetchPrompts, fetchSavedPromptIds } from '../api.js';
import { promptCardHTML, attachCopyHandlers, attachSaveHandlers } from '../components/promptCard.js';
import { isAuthenticated } from '../auth.js';
import { toast } from '../core.js';

document.title = 'PromptForge — Premium AI Prompt Library';
const grid = document.getElementById('trending-prompts-grid');
if (!grid) throw new Error('No grid element');

// Skeletons
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
    if (isAuthenticated()) {
        try {
            const saveRes = await fetchSavedPromptIds();
            if (saveRes.success) savedIds = saveRes.data || [];
        } catch (e) {
            console.warn('Failed to fetch saved IDs', e);
        }
    }

    grid.innerHTML = prompts.map(p => promptCardHTML({ ...p, isSaved: savedIds.includes(p.id) })).join('');
    attachCopyHandlers(grid);
    attachSaveHandlers(grid);
  }
} catch (err) {
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171">${err.message}</div>`;
}
