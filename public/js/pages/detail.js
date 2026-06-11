import { fetchPromptBySlug, trackCopy, trackView, fetchSavedPromptIds, fetchLikedPromptIds, likePrompt, unlikePrompt } from '/js/api.js';
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
let isLiked = false;

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
        const [saveRes, likeRes] = await Promise.all([
            fetchSavedPromptIds().catch(() => ({ data: [] })),
            fetchLikedPromptIds().catch(() => ({ data: [] }))
        ]);
        isSaved = (saveRes.data || []).includes(prompt.id);
        isLiked = (likeRes.data || []).includes(prompt.id);
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
            <button id="like-page-btn" class="btn ${isLiked ? 'btn-primary' : 'btn-secondary'}" style="width:100%;gap:0.5rem;${isLiked ? 'background:#ef4444;color:#fff;border-color:#ef4444;' : ''}" data-prompt-id="${prompt.id}">
              <svg width="16" height="16" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              <span>${isLiked ? 'Liked' : 'Like Prompt'}</span>
            </button>
            <button id="tip-btn" class="btn btn-secondary" style="width:100%;gap:0.5rem;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;">
              ☕ Tip Creator ($5)
            </button>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;">
              <div style="text-align:center;padding:0.75rem 0.25rem;background:var(--bg-2);border-radius:var(--radius-sm);">
                <div style="font-size:1.1rem;font-weight:800;">${(prompt.view_count || 0).toLocaleString()}</div>
                <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.2rem;">Views</div>
              </div>
              <div style="text-align:center;padding:0.75rem 0.25rem;background:var(--bg-2);border-radius:var(--radius-sm);">
                <div style="font-size:1.1rem;font-weight:800;">${(prompt.copy_count || 0).toLocaleString()}</div>
                <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.2rem;">Copies</div>
              </div>
              <div style="text-align:center;padding:0.75rem 0.25rem;background:var(--bg-2);border-radius:var(--radius-sm);">
                <div style="font-size:1.1rem;font-weight:800;" id="like-count-el">${(prompt.like_count || 0).toLocaleString()}</div>
                <div style="font-size:0.65rem;color:var(--text-muted);margin-top:0.2rem;">Likes</div>
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

// ─── Like Handler ─────────────────────────────────────────────────────────────
document.getElementById('like-page-btn')?.addEventListener('click', async () => {
    if (!await isAuthenticated()) {
        toast.error('Sign in to like prompts.');
        setTimeout(() => { window.location.href = `/login.html?next=${encodeURIComponent(window.location.href)}`; }, 1200);
        return;
    }
    const btn = document.getElementById('like-page-btn');
    const label = btn.querySelector('span');
    const svg = btn.querySelector('svg');
    const likeCountEl = document.getElementById('like-count-el');
    
    btn.disabled = true;
    
    try {
        if (isLiked) {
            await unlikePrompt(prompt.id);
            isLiked = false;
            btn.className = 'btn btn-secondary';
            btn.style.cssText = 'width:100%;gap:0.5rem;';
            svg.setAttribute('fill', 'none');
            label.textContent = 'Like Prompt';
            prompt.like_count = Math.max(0, (prompt.like_count || 0) - 1);
            toast.success('Like removed.');
        } else {
            await likePrompt(prompt.id);
            isLiked = true;
            btn.className = 'btn btn-primary';
            btn.style.cssText = 'width:100%;gap:0.5rem;background:#ef4444;color:#fff;border-color:#ef4444;';
            svg.setAttribute('fill', 'currentColor');
            label.textContent = 'Liked';
            prompt.like_count = (prompt.like_count || 0) + 1;
            toast.success('Prompt liked!');
        }
        if (likeCountEl) likeCountEl.textContent = prompt.like_count.toLocaleString();
    } catch (err) {
        toast.error(err.message || 'Action failed.');
    } finally {
        btn.disabled = false;
    }
});

// ─── Collections Modal Handler ──────────────────────────────────────────────────
import { fetchCollections, createCollection, toggleCollectionPrompt } from '/js/api.js';

const saveBtn = document.getElementById('save-btn');
const modal = document.getElementById('collection-modal');
const colList = document.getElementById('collection-list');
const createColBtn = document.getElementById('create-col-btn');
const newColName = document.getElementById('new-col-name');

let collectionsCache = null;

const renderCollections = () => {
    if (!collectionsCache?.length) {
        colList.innerHTML = `<div style="color:var(--text-muted);font-size:0.875rem;text-align:center;padding:1rem 0;">No collections yet. Create one below!</div>`;
        return;
    }
    colList.innerHTML = collectionsCache.map(col => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1rem;background:var(--bg-2);border:1px solid var(--border-2);border-radius:var(--radius-sm);">
        <div>
          <div style="font-size:0.875rem;font-weight:600;color:var(--text);">${clean(col.name)}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">${col.prompt_count} prompts</div>
        </div>
        <button class="btn btn-sm btn-secondary toggle-col-btn" data-id="${col.id}" style="padding:0.35rem 0.75rem;">
           Save
        </button>
      </div>
    `).join('');

    // Attach handlers
    document.querySelectorAll('.toggle-col-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const colId = e.currentTarget.dataset.id;
            const originalText = e.currentTarget.textContent;
            e.currentTarget.textContent = '...';
            e.currentTarget.disabled = true;
            try {
                const res = await toggleCollectionPrompt(colId, prompt.id);
                toast.success(res.saved ? 'Saved to collection!' : 'Removed from collection');
                
                // Update button state and count locally
                const col = collectionsCache.find(c => c.id === colId);
                if (col) col.prompt_count += res.saved ? 1 : -1;
                
                e.currentTarget.textContent = res.saved ? 'Saved ✓' : 'Save';
                e.currentTarget.classList.toggle('btn-primary', res.saved);
                e.currentTarget.classList.toggle('btn-secondary', !res.saved);
                
                // Update the main page save button state
                isSaved = true; // Once saved anywhere, consider it "saved"
                saveBtn.className = 'btn btn-primary';
                saveBtn.innerHTML = `<svg width="16" height="16" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg> Saved`;
            } catch (err) {
                toast.error(err.message);
                e.currentTarget.textContent = originalText;
            } finally {
                e.currentTarget.disabled = false;
            }
        });
    });
};

saveBtn?.addEventListener('click', async () => {
    if (!await isAuthenticated()) {
        toast.error('Sign in to save prompts.');
        setTimeout(() => { window.location.href = `/login.html?next=${encodeURIComponent(window.location.href)}`; }, 1200);
        return;
    }
    
    modal.style.display = 'flex';
    
    try {
        if (!collectionsCache) {
            const res = await fetchCollections();
            collectionsCache = res.data || [];
        }
        renderCollections();
    } catch (err) {
        colList.innerHTML = `<div style="color:#f87171;font-size:0.875rem;text-align:center;padding:1rem 0;">Failed to load collections.</div>`;
    }
});

createColBtn?.addEventListener('click', async () => {
    const name = newColName.value.trim();
    if (!name) return;
    
    createColBtn.disabled = true;
    createColBtn.textContent = '...';
    try {
        const res = await createCollection(name);
        toast.success('Collection created!');
        newColName.value = '';
        collectionsCache.unshift({ ...res.data, prompt_count: 0 });
        renderCollections();
    } catch (err) {
        toast.error(err.message);
    } finally {
        createColBtn.disabled = false;
        createColBtn.textContent = 'Create';
    }
});

// ─── Tip Creator Handler ──────────────────────────────────────────────────────
document.getElementById('tip-btn')?.addEventListener('click', async () => {
    if (!await isAuthenticated()) {
        toast.error('Sign in to tip the creator.');
        setTimeout(() => { window.location.href = `/login.html?next=${encodeURIComponent(window.location.href)}`; }, 1200);
        return;
    }
    
    try {
        const btn = document.getElementById('tip-btn');
        btn.disabled = true;
        btn.textContent = 'Redirecting...';
        
        const token = localStorage.getItem('sb_access_token');
        const res = await fetch(`${API_BASE_URL}/checkout/create-session`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                promptId: prompt.id, 
                promptTitle: prompt.title,
                slug: prompt.slug 
            })
        });
        const json = await res.json();
        if (json.success && json.url) {
            window.location.href = json.url;
        } else {
            throw new Error(json.error || 'Failed to create checkout session');
        }
    } catch (err) {
        toast.error(err.message);
        const btn = document.getElementById('tip-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '☕ Tip Creator ($5)';
        }
    }
});

// ─── View Tracking (non-blocking, fires once per page load) ───────────────────
// Small delay ensures the page has rendered before we count the view
setTimeout(() => trackView(prompt.id), 1500);

// ─── Reviews Logic ──────────────────────────────────────────────────────────
const reviewsList = document.getElementById('reviews-list');
const avgRatingEl = document.getElementById('avg-rating');
const reviewFormContainer = document.getElementById('review-form-container');

const loadReviews = async () => {
    if (!reviewsList) return;
    try {
        const res = await fetch(`${API_BASE_URL}/reviews/${prompt.id}`);
        const { data: reviews } = await res.json();
        
        if (!reviews || !reviews.length) {
            reviewsList.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);background:var(--bg-2);border-radius:var(--radius-lg);">No reviews yet. Be the first to share your experience!</div>`;
            return;
        }

        // Calculate average
        const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
        if (avgRatingEl) {
            avgRatingEl.innerHTML = `<span>★ ${avg.toFixed(1)}</span> <span style="font-size:0.875rem;color:var(--text-muted);font-weight:400;">(${reviews.length} reviews)</span>`;
        }

        reviewsList.innerHTML = reviews.map(r => {
            const date = new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            const avatarUrl = r.profiles?.avatar_url;
            const displayName = r.profiles?.display_name || 'Anonymous User';
            
            return `
              <div class="review-item">
                <div class="review-author">
                  <div class="review-avatar">
                    ${avatarUrl ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
                  </div>
                  <div style="flex:1;">
                    <div style="display:flex;align-items:center;justify-content:space-between;">
                       <span style="font-weight:600;font-size:0.9375rem;">${clean(displayName)}</span>
                       <span style="font-size:0.75rem;color:var(--text-muted);">${date}</span>
                    </div>
                    <div style="color:#fbbf24;font-size:0.8125rem;margin-top:0.15rem;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                  </div>
                </div>
                ${r.comment ? `<p style="font-size:0.875rem;line-height:1.6;color:var(--text-subtle);">${clean(r.comment)}</p>` : ''}
              </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load reviews', err);
    }
};

// Handle Star Rating UI
const starBtns = document.querySelectorAll('.star-btn');
const ratingValue = document.getElementById('rating-value');

starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.val);
        ratingValue.value = val;
        starBtns.forEach((b, i) => {
            b.classList.toggle('active', i < val);
        });
    });
});

// Review Form Submission
const reviewForm = document.getElementById('review-form');
if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = parseInt(ratingValue.value);
        if (rating === 0) return toast.error('Please select a star rating');
        
        const comment = document.getElementById('review-comment').value.trim();
        const submitBtn = document.getElementById('submit-review-btn');
        submitBtn.disabled = true;
        
        try {
            const token = localStorage.getItem('sb_access_token');
            const res = await fetch(`${API_BASE_URL}/reviews/${prompt.id}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ rating, comment })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to submit review');
            
            toast.success('Review submitted!');
            reviewForm.reset();
            starBtns.forEach(b => b.classList.remove('active'));
            ratingValue.value = 0;
            loadReviews();
        } catch (err) {
            toast.error(err.message);
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// Show form if authenticated
if (authed && reviewFormContainer) {
    reviewFormContainer.style.display = 'block';
}

loadReviews();
