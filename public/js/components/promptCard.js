import { isAuthenticated } from '/js/auth.js';
import { trackCopy } from '/js/api.js';
import { toast } from '/js/core.js';

// ─── DOMPurify sanitizer ──────────────────────────────────────────────────────
const clean = (str) => typeof DOMPurify !== 'undefined'
    ? DOMPurify.sanitize(str ?? '')
    : (str ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttr = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// ─── Prompt Card HTML ─────────────────────────────────────────────────────────
const TYPE_PILL = {
    'text-to-image': '<span class="badge-type badge-type-image">🖼 Image</span>',
    'text-to-text':  '<span class="badge-type badge-type-text">📝 Text</span>',
    'text-to-video': '<span class="badge-type badge-type-video">🎬 Video</span>',
};

export const promptCardHTML = (p) => {
    const id = escapeAttr(p.id);
    const titleAttr = escapeAttr(p.title);
    const slug = encodeURIComponent(p.slug ?? '');
    const difficultyClass = String(p.difficulty ?? '').replace(/[^a-z0-9_-]/gi, '');
    const image = p.preview_image_url
        ? `<img src="${escapeAttr(p.preview_image_url)}" alt="${titleAttr}" loading="lazy">`
        : `<div class="card-image-placeholder">✨</div>`;

    const typePill = TYPE_PILL[p.prompt_type] || '';
    const likeCount = p.like_count ?? 0;

    return `
      <article class="prompt-card" data-id="${id}">
        <a href="/prompt-detail.html?slug=${slug}" style="display:contents;">
          <div class="card-image">${image}</div>
        </a>
        <div class="card-body">
          <a href="/prompt-detail.html?slug=${slug}" style="text-decoration:none;">
            <h3 class="card-title">${clean(p.title)}</h3>
          </a>
          ${p.description ? `<p class="card-desc">${clean(p.description)}</p>` : ''}
          <div class="card-footer">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
              <span class="badge badge-${difficultyClass}">${clean(p.difficulty)}</span>
              ${typePill}
              ${p.is_trending ? '<span class="badge-trending">🔥 Trending</span>' : ''}
            </div>
            <div style="display:flex;align-items:center;gap:0.4rem;">
              <button
                class="like-btn${p.isLiked ? ' active' : ''}"
                data-like-prompt-id="${id}"
                aria-label="Like prompt"
                style="background:none;border:none;cursor:pointer;color:${p.isLiked ? '#ef4444' : 'var(--text-muted)'};display:flex;align-items:center;justify-content:center;padding:0.25rem;transition:color var(--transition);"
              >
                <svg width="15" height="15" fill="${p.isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              </button>
              <span class="like-count" data-like-count="${id}">${likeCount > 0 ? likeCount : ''}</span>
              <button
                class="copy-btn"
                data-copy-prompt-id="${id}"
                data-prompt-text="${escapeAttr(p.prompt_text ?? '')}"
                aria-label="Copy prompt"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </article>`;
};

// ─── Copy & Like Handlers ────────────────────────────────────────────────────────────
export const attachCopyHandlers = (container) => {
    container.addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('[data-copy-prompt-id]');
        if (copyBtn) {
            if (!await isAuthenticated()) {
                toast.error('Sign in to copy prompts.');
                setTimeout(() => {
                    window.location.href = `/login.html?next=${encodeURIComponent(window.location.href)}`;
                }, 1200);
                return;
            }

            const id   = copyBtn.dataset.copyPromptId;
            const text = copyBtn.dataset.promptText;

            if (!text) {
                toast.error('Prompt text not available.');
                return;
            }

            try {
                await navigator.clipboard.writeText(text);
                const original = copyBtn.innerHTML;
                copyBtn.innerHTML = '✓';
                copyBtn.style.color = '#4ade80';
                setTimeout(() => { copyBtn.innerHTML = original; copyBtn.style.color = ''; }, 2000);
                toast.success('Copied to clipboard!');
                trackCopy(id);
            } catch {
                toast.error('Copy failed. Please try again.');
            }
            return;
        }

        const likeBtn = e.target.closest('[data-like-prompt-id]');
        if (likeBtn) {
            if (!await isAuthenticated()) {
                toast.error('Sign in to like prompts.');
                setTimeout(() => {
                    window.location.href = `/login.html?next=${encodeURIComponent(window.location.href)}`;
                }, 1200);
                return;
            }

            const id = likeBtn.dataset.likePromptId;
            const isLiked = likeBtn.classList.contains('active');
            likeBtn.disabled = true;

            const { likePrompt, unlikePrompt } = await import('/js/api.js');

            // find the sibling like-count span
            const countEl = likeBtn.closest('[style]')?.querySelector(`[data-like-count="${id}"]`)
                         ?? likeBtn.parentElement?.querySelector(`[data-like-count="${id}"]`);

            try {
                if (isLiked) {
                    await unlikePrompt(id);
                    likeBtn.classList.remove('active');
                    likeBtn.style.color = 'var(--text-muted)';
                    likeBtn.querySelector('svg').setAttribute('fill', 'none');
                    if (countEl) {
                        const n = Math.max(0, (parseInt(countEl.textContent) || 0) - 1);
                        countEl.textContent = n > 0 ? n : '';
                    }
                    toast.success('Like removed.');
                } else {
                    await likePrompt(id);
                    likeBtn.classList.add('active');
                    likeBtn.style.color = '#ef4444';
                    likeBtn.querySelector('svg').setAttribute('fill', 'currentColor');
                    if (countEl) {
                        const n = (parseInt(countEl.textContent) || 0) + 1;
                        countEl.textContent = n;
                    }
                    toast.success('Prompt liked!');
                }
            } catch (err) {
                toast.error(err.message || 'Action failed.');
            } finally {
                likeBtn.disabled = false;
            }
        }
    });
};
