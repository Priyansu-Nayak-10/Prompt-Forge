import { fetchPromptBySlug, trackCopy, trackView, toggleSave as apiToggleSave, fetchSavedPromptIds } from '/js/api.js';
import { toast } from '/js/core.js';
import { isAuthenticated } from '/js/auth.js';

// ─── DOMPurify sanitizer ──────────────────────────────────────────────────────
const clean = (str) => typeof DOMPurify !== 'undefined'
    ? DOMPurify.sanitize(str ?? '')
    : (str ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── Load Prompt ──────────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const slug   = params.get('slug');

if (!slug) {
    document.title = 'Not Found — PromptForge';
    document.querySelector('main')?.insertAdjacentHTML('afterbegin',
        '<p style="padding:4rem;text-align:center;color:var(--text-muted);">No prompt specified.</p>'
    );
    throw new Error('No slug');
}

let prompt = null;
let isSaved = false;

try {
    const res = await fetchPromptBySlug(slug);
    if (!res.success || !res.data) throw new Error('Prompt not found');
    prompt = res.data;
} catch (err) {
    document.title = 'Not Found — PromptForge';
    document.querySelector('#prompt-content')?.insertAdjacentHTML('afterbegin',
        `<div style="padding:4rem;text-align:center;color:#f87171;">Prompt not found.</div>`
    );
    throw err;
}

// ─── SEO Meta Tags ────────────────────────────────────────────────────────────
document.title = `${prompt.title} — PromptForge`;

const setMeta = (name, content, prop = false) => {
    const attr = prop ? 'property' : 'name';
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
    el.setAttribute('content', content);
};

const canonical = `${window.location.origin}/prompt-detail.html?slug=${prompt.slug}`;
setMeta('description', prompt.description || prompt.title);
setMeta('og:title',       prompt.title, true);
setMeta('og:description', prompt.description || prompt.title, true);
setMeta('og:type',        'article', true);
setMeta('og:url',         canonical, true);
if (prompt.preview_image_url) setMeta('og:image', prompt.preview_image_url, true);
setMeta('twitter:card',  'summary_large_image');
setMeta('twitter:title', prompt.title);

let link = document.querySelector('link[rel="canonical"]');
if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
link.href = canonical;

// ─── Check saved state ────────────────────────────────────────────────────────
const authed = await isAuthenticated();
if (authed) {
    try {
        const saveRes = await fetchSavedPromptIds();
        isSaved = (saveRes.data || []).includes(prompt.id);
    } catch { /* non-fatal */ }
}

// ─── Render Detail ────────────────────────────────────────────────────────────
const container = document.getElementById('prompt-content');
if (container) {
    const catName = prompt.categories?.name || '';
    const catSlug = prompt.categories?.slug || '';
    const dateStr = new Date(prompt.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    container.innerHTML = `
      <div class="detail-layout" style="display:grid;grid-template-columns:1fr 360px;gap:2rem;align-items:start;">
        <!-- Left: main content -->
        <div>
          ${prompt.preview_image_url ? `<div class="detail-image" style="border-radius:var(--radius-lg);overflow:hidden;margin-bottom:1.75rem;max-height:360px;"><img src="${clean(prompt.preview_image_url)}" alt="${clean(prompt.title)}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"></div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1.25rem;align-items:center;">
            ${catName ? `<a href="/prompts.html?category=${catSlug}" class="chip">${clean(catName)}</a>` : ''}
            <span class="badge badge-${prompt.difficulty}">${clean(prompt.difficulty)}</span>
            ${prompt.is_trending ? '<span class="badge-trending">🔥 Trending</span>' : ''}
          </div>
          <h1 style="font-size:clamp(1.5rem,3vw,2.25rem);font-weight:800;letter-spacing:-0.03em;line-height:1.2;margin-bottom:1rem;">${clean(prompt.title)}</h1>
          ${prompt.description ? `<p style="color:var(--text-muted);font-size:1rem;line-height:1.7;margin-bottom:1.75rem;">${clean(prompt.description)}</p>` : ''}

          <div class="prompt-text-block" style="background:var(--bg-2);border:1px solid var(--border-2);border-radius:var(--radius-lg);padding:1.5rem;position:relative;margin-bottom:1.75rem;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
              <span style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);">Prompt</span>
              <button id="copy-btn" class="btn btn-secondary btn-sm" data-prompt-id="${prompt.id}">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Copy
              </button>
            </div>
            <pre style="white-space:pre-wrap;word-break:break-word;font-family:'JetBrains Mono',monospace;font-size:0.8125rem;line-height:1.7;color:var(--text);" id="prompt-text-el">${clean(prompt.prompt_text)}</pre>
          </div>

          ${prompt.negative_prompt ? `
          <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.25rem;margin-bottom:1.75rem;">
            <div style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:0.75rem;">Negative Prompt</div>
            <pre style="white-space:pre-wrap;word-break:break-word;font-family:'JetBrains Mono',monospace;font-size:0.8rem;line-height:1.65;color:var(--text-muted);">${clean(prompt.negative_prompt)}</pre>
          </div>` : ''}

          ${prompt.tags?.length ? `<div style="display:flex;flex-wrap:wrap;gap:0.375rem;">${prompt.tags.map(t => `<span class="chip" style="font-size:0.75rem;padding:0.2rem 0.7rem;">${clean(t)}</span>`).join('')}</div>` : ''}
        </div>

        <!-- Right: sidebar -->
        <aside style="position:sticky;top:80px;">
          <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:1.5rem;display:flex;flex-direction:column;gap:1rem;">
            <button id="save-btn" class="btn ${isSaved ? 'btn-primary' : 'btn-secondary'}" style="width:100%;gap:0.5rem;" data-prompt-id="${prompt.id}">
              <svg width="16" height="16" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              ${isSaved ? 'Saved' : 'Save Prompt'}
            </button>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
              <div style="text-align:center;padding:0.75rem;background:var(--bg-2);border-radius:var(--radius-sm);">
                <div style="font-size:1.25rem;font-weight:800;">${(prompt.view_count || 0).toLocaleString()}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.2rem;">Views</div>
              </div>
              <div style="text-align:center;padding:0.75rem;background:var(--bg-2);border-radius:var(--radius-sm);">
                <div style="font-size:1.25rem;font-weight:800;">${(prompt.copy_count || 0).toLocaleString()}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-top:0.2rem;">Copies</div>
              </div>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);border-top:1px solid var(--border);padding-top:0.875rem;">
              <div style="margin-bottom:0.4rem;">📅 ${dateStr}</div>
              ${prompt.type ? `<div>🏷️ ${clean(prompt.type)}</div>` : ''}
            </div>
          </div>
        </aside>
      </div>

      <style>
        @media (max-width: 768px) {
          .detail-layout { grid-template-columns: 1fr !important; }
        }
      </style>
    `;
}

// ─── Copy Handler ─────────────────────────────────────────────────────────────
document.getElementById('copy-btn')?.addEventListener('click', async () => {
    if (!await isAuthenticated()) {
        toast.error('Sign in to copy prompts.');
        setTimeout(() => { window.location.href = `/login.html?next=${encodeURIComponent(window.location.href)}`; }, 1200);
        return;
    }
    try {
        await navigator.clipboard.writeText(prompt.prompt_text);
        const btn = document.getElementById('copy-btn');
        if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy'; }, 2000); }
        toast.success('Prompt copied!');
        trackCopy(prompt.id);
    } catch {
        toast.error('Copy failed. Please select and copy manually.');
    }
});

// ─── Save Handler ─────────────────────────────────────────────────────────────
document.getElementById('save-btn')?.addEventListener('click', async () => {
    if (!await isAuthenticated()) {
        toast.error('Sign in to save prompts.');
        setTimeout(() => { window.location.href = `/login.html?next=${encodeURIComponent(window.location.href)}`; }, 1200);
        return;
    }
    const btn = document.getElementById('save-btn');
    if (!btn) return;
    btn.disabled = true;
    try {
        const res = await apiToggleSave(prompt.id);
        isSaved = res.data?.saved ?? !isSaved;
        btn.className = `btn ${isSaved ? 'btn-primary' : 'btn-secondary'}`;
        btn.innerHTML = `<svg width="16" height="16" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg> ${isSaved ? 'Saved' : 'Save Prompt'}`;
        toast.success(isSaved ? 'Prompt saved!' : 'Removed from saved.');
    } catch (err) {
        toast.error(err.message);
    } finally {
        btn.disabled = false;
    }
});

// ─── View Tracking (non-blocking, fires once per page load) ───────────────────
// Small delay ensures the page has rendered before we count the view
setTimeout(() => trackView(prompt.id), 1500);
