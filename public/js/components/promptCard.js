/**
 * promptCard.js — Reusable prompt card with design system classes
 */
import { trackCopy, toggleSave as apiToggleSave } from '../api.js';
import { toast } from '../toast.js';
import { isAuthenticated } from '../auth.js';

export const promptCardHTML = (p) => `
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
      <div class="card-footer" style="display:flex;gap:0.5rem;align-items:center;">
        <span class="badge badge-${p.difficulty || 'intermediate'}" style="margin-right:auto;">${p.difficulty || 'intermediate'}</span>
        <button
          class="save-btn save-trigger ${p.isSaved ? 'saved' : ''}"
          data-id="${p.id}"
          aria-label="Save prompt"
          style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0.25rem;"
        >
          <svg width="16" height="16" fill="${p.isSaved ? '#f43f5e' : 'none'}" stroke="${p.isSaved ? '#f43f5e' : 'currentColor'}" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        <button
          class="copy-btn copy-trigger"
          data-id="${p.id}"
          data-text="${encodeURIComponent(p.prompt_text)}"
          aria-label="Copy prompt"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
          </svg>
        </button>
      </div>
    </div>
  </article>
`;

export const attachCopyHandlers = (container) => {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('.copy-trigger');
    if (!btn) return;
    e.preventDefault();

    if (!isAuthenticated()) {
      toast.error('Please login to copy prompts');
      setTimeout(() => {
        window.location.href = '/login.html?next=' + encodeURIComponent(window.location.href);
      }, 1500);
      return;
    }

    try {
      await navigator.clipboard.writeText(decodeURIComponent(btn.dataset.text));
      toast.success('Prompt copied!');
      trackCopy(btn.dataset.id);
    } catch {
      toast.error('Copy failed. Please try manually.');
    }
  });
};

export const attachSaveHandlers = (container) => {
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('.save-trigger');
    if (!btn) return;
    e.preventDefault();

    if (!isAuthenticated()) {
      toast.error('Please login to save prompts');
      setTimeout(() => {
        window.location.href = '/login.html?next=' + encodeURIComponent(window.location.href);
      }, 1500);
      return;
    }

    try {
      const promptId = btn.dataset.id;
      const res = await apiToggleSave(promptId);
      if (res.saved) {
        btn.classList.add('saved');
        btn.innerHTML = \`<svg width="16" height="16" fill="#f43f5e" stroke="#f43f5e" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>\`;
        toast.success('Prompt saved');
      } else {
        btn.classList.remove('saved');
        btn.innerHTML = \`<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>\`;
        toast.success('Prompt removed from saves');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save prompt');
    }
  });
};
