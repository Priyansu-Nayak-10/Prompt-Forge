import { isAuthenticated } from '/js/auth.js';
import { trackCopy, toggleSave } from '/js/api.js';
import { toast } from '/js/core.js';

// ─── DOMPurify sanitizer ──────────────────────────────────────────────────────
const clean = (str) => typeof DOMPurify !== 'undefined'
    ? DOMPurify.sanitize(str ?? '')
    : (str ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── Prompt Card HTML ─────────────────────────────────────────────────────────
export const promptCardHTML = (p) => {
    const image = p.preview_image_url
        ? `<img src="${clean(p.preview_image_url)}" alt="${clean(p.title)}" loading="lazy">`
        : `<div class="card-image-placeholder">✨</div>`;

    return `
      <article class="prompt-card" data-id="${p.id}">
        <a href="/prompt-detail.html?slug=${encodeURIComponent(p.slug)}" style="display:contents;">
          <div class="card-image">${image}</div>
        </a>
        <div class="card-body">
          <a href="/prompt-detail.html?slug=${encodeURIComponent(p.slug)}" style="text-decoration:none;">
            <h3 class="card-title">${clean(p.title)}</h3>
          </a>
          ${p.description ? `<p class="card-desc">${clean(p.description)}</p>` : ''}
          <div class="card-footer">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
              <span class="badge badge-${p.difficulty}">${clean(p.difficulty)}</span>
              ${p.is_trending ? '<span class="badge-trending">🔥 Trending</span>' : ''}
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <button
                class="save-btn ${p.isSaved ? 'saved' : ''}"
                data-save-prompt-id="${p.id}"
                aria-label="${p.isSaved ? 'Remove from saved' : 'Save prompt'}"
                style="width:28px;height:28px;border-radius:var(--radius-xs);border:1px solid var(--border);background:var(--bg-2);color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all var(--transition);"
              >
                <svg width="13" height="13" fill="${p.isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              </button>
              <button
                class="copy-btn"
                data-copy-prompt-id="${p.id}"
                data-prompt-text="${clean(p.prompt_text ?? '')}"
                aria-label="Copy prompt"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </article>`;
};

// ─── Copy Handlers ────────────────────────────────────────────────────────────
export const attachCopyHandlers = (container) => {
    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-copy-prompt-id]');
        if (!btn) return;

        if (!await isAuthenticated()) {
            toast.error('Sign in to copy prompts.');
            setTimeout(() => {
                window.location.href = `/login.html?next=${encodeURIComponent(window.location.href)}`;
            }, 1200);
            return;
        }

        const id   = btn.dataset.copyPromptId;
        const text = btn.dataset.promptText;

        if (!text) {
            toast.error('Prompt text not available.');
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            const original = btn.innerHTML;
            btn.innerHTML = '✓';
            btn.style.color = '#4ade80';
            setTimeout(() => { btn.innerHTML = original; btn.style.color = ''; }, 2000);
            toast.success('Copied to clipboard!');
            trackCopy(id);
        } catch {
            toast.error('Copy failed. Please try again.');
        }
    });
};

// ─── Save Handlers ────────────────────────────────────────────────────────────
export const attachSaveHandlers = (container) => {
    container.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-save-prompt-id]');
        if (!btn) return;

        if (!await isAuthenticated()) {
            toast.error('Sign in to save prompts.');
            setTimeout(() => {
                window.location.href = `/login.html?next=${encodeURIComponent(window.location.href)}`;
            }, 1200);
            return;
        }

        const id = btn.dataset.savePromptId;
        const savedNow = btn.classList.contains('saved');
        btn.disabled = true;

        try {
            const res = await toggleSave(id);
            const isSaved = res.data?.saved ?? !savedNow;

            // Update icon
            const svg = btn.querySelector('svg');
            if (svg) svg.setAttribute('fill', isSaved ? 'currentColor' : 'none');
            btn.classList.toggle('saved', isSaved);
            btn.setAttribute('aria-label', isSaved ? 'Remove from saved' : 'Save prompt');
            toast.success(isSaved ? 'Prompt saved!' : 'Removed from saved.');
        } catch (err) {
            toast.error(err.message || 'Failed to save. Please try again.');
        } finally {
            btn.disabled = false;
        }
    });
};
