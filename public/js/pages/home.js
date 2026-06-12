import { fetchPrompts, fetchSavedPromptIds, fetchLikedPromptIds } from '/js/api.js';
import { promptCardHTML, attachCopyHandlers } from '/js/components/promptCard.js';
import { isAuthenticated } from '/js/auth.js';

document.title = 'PromptForge — AI Prompt Discovery Platform';

// \u2500\u2500\u2500 Cycling Search Placeholder \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const SEARCH_PHRASES = [
    'Search "cinematic portrait"...',
    'Search "anime landscape"...',
    'Search "product photography"...',
    'Search "4K sci-fi environment"...',
    'Search "watercolour illustration"...',
    'Search "neon cyberpunk city"...',
];

const cycleSearchPlaceholder = (input) => {
    let phraseIndex = 0;
    let charIndex = 0;
    let erasing = false;
    let paused = false;
    let timer = null;

    const ERASE_SPEED = 30;
    const TYPE_SPEED  = 48;
    const PAUSE_MS    = 2200;

    const tick = () => {
        if (paused) return;
        const phrase = SEARCH_PHRASES[phraseIndex];

        if (erasing) {
            charIndex--;
            input.placeholder = phrase.slice(0, charIndex);
            if (charIndex === 0) {
                erasing = false;
                phraseIndex = (phraseIndex + 1) % SEARCH_PHRASES.length;
                timer = setTimeout(tick, 300);
                return;
            }
            timer = setTimeout(tick, ERASE_SPEED);
        } else {
            charIndex++;
            input.placeholder = phrase.slice(0, charIndex);
            if (charIndex === phrase.length) {
                erasing = true;
                timer = setTimeout(tick, PAUSE_MS);
                return;
            }
            timer = setTimeout(tick, TYPE_SPEED);
        }
    };

    input.addEventListener('focus', () => { paused = true; clearTimeout(timer); });
    input.addEventListener('blur',  () => { paused = false; tick(); });

    // small delay so page renders first
    setTimeout(tick, 800);
};

const searchInput = document.querySelector('.search-input');
if (searchInput) cycleSearchPlaceholder(searchInput);

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
        let likedIds = [];
        if (await isAuthenticated()) {
            try {
                const [saveRes, likeRes] = await Promise.all([
                    fetchSavedPromptIds().catch(() => ({ success: false, data: [] })),
                    fetchLikedPromptIds().catch(() => ({ success: false, data: [] }))
                ]);
                if (saveRes.success) savedIds = saveRes.data || [];
                if (likeRes.success) likedIds = likeRes.data || [];
            } catch { /* non-fatal */ }
        }

        grid.innerHTML = prompts.map(p => promptCardHTML({
            ...p,
            isSaved: savedIds.includes(p.id),
            isLiked: likedIds.includes(p.id)
        })).join('');
        attachCopyHandlers(grid);
    }
} catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171">${err.message}</div>`;
}

// ─── Newsletter Form ───────────────────────────────────────────────────────────
const newsletterForm = document.getElementById('newsletter-form');
const newsletterMsg  = document.getElementById('newsletter-msg');
const newsletterBtn  = document.getElementById('newsletter-btn');

if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('newsletter-email').value;
        if (!email) return;

        newsletterBtn.disabled = true;
        newsletterBtn.textContent = 'Subscribing...';
        newsletterMsg.style.display = 'none';
        newsletterMsg.style.color = 'var(--text-muted)';

        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            newsletterMsg.style.display = 'block';
            if (data.success) {
                newsletterMsg.style.color = '#4ade80';
                newsletterMsg.textContent = '🎉 ' + data.message;
                newsletterForm.reset();
            } else {
                newsletterMsg.style.color = '#f87171';
                newsletterMsg.textContent = data.error || (data.errors ? data.errors[0].msg : 'Failed to subscribe.');
            }
        } catch (err) {
            newsletterMsg.style.display = 'block';
            newsletterMsg.style.color = '#f87171';
            newsletterMsg.textContent = 'An error occurred. Please try again later.';
        } finally {
            newsletterBtn.disabled = false;
            newsletterBtn.textContent = 'Subscribe';
        }
    });
}
