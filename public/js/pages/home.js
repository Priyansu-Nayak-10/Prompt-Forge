import { fetchPrompts, trackCopy } from '../api.js';
import { toast } from '../toast.js';

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
    grid.innerHTML = prompts.map(p => `
      <article class="prompt-card animate-fade-up">
        <a href="/prompt-detail.html?slug=${p.slug}" class="card-image">
          ${p.preview_image_url
            ? `<img src="${p.preview_image_url}" alt="${p.title}" loading="lazy">`
            : `<div class="card-image-placeholder"><span>✨</span></div>`
          }
        </a>
        <div class="card-body">
          <a href="/prompt-detail.html?slug=${p.slug}" style="text-decoration:none;">
            <div class="card-title">${p.title}</div>
          </a>
          <div class="card-desc">${p.description || p.prompt_text}</div>
          <div class="card-footer">
            <span class="badge badge-${p.difficulty || 'intermediate'}">${p.difficulty || 'intermediate'}</span>
            <button class="copy-btn copy-trigger" data-id="${p.id}" data-text="${encodeURIComponent(p.prompt_text)}" aria-label="Copy">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </article>
    `).join('');

    grid.addEventListener('click', async (e) => {
      const btn = e.target.closest('.copy-trigger');
      if (!btn) return;
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(decodeURIComponent(btn.dataset.text));
        toast.success('Prompt copied!');
        trackCopy(btn.dataset.id);
      } catch { toast.error('Copy failed'); }
    });
  }
} catch (err) {
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171">${err.message}</div>`;
}
