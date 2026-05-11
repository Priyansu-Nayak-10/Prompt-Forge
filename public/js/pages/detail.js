import { fetchPromptBySlug, trackCopy } from '../api.js';
import { toast } from '../toast.js';

const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('slug');
const loader  = document.getElementById('loader');
const content = document.getElementById('prompt-content');

if (!slug) {
    loader.style.display = 'none';
    content.style.display = 'block';
    content.innerHTML = `<div style="text-align:center;padding:4rem;color:var(--text-muted)">Invalid prompt URL.</div>`;
} else {
    try {
        const res = await fetchPromptBySlug(slug);
        if (!res?.success || !res.data) throw new Error('Prompt not found');
        const p = res.data;

        // SEO
        document.title = `${p.title} — PromptForge`;
        const setMeta = (prop, val) => {
            let el = document.querySelector(`[property="${prop}"]`) || document.createElement('meta');
            el.setAttribute('property', prop); el.content = val;
            if (!el.parentNode) document.head.appendChild(el);
        };
        const canonical = document.createElement('link');
        canonical.rel = 'canonical'; canonical.href = window.location.href;
        document.head.appendChild(canonical);
        setMeta('og:title', p.title);
        setMeta('og:description', p.description || p.prompt_text.substring(0, 150));
        if (p.preview_image_url) setMeta('og:image', p.preview_image_url);

        const diffColor = { beginner: '#4ade80', intermediate: '#a78bfa', advanced: '#fb923c' };
        const dc = diffColor[p.difficulty] || '#a78bfa';

        content.innerHTML = `
            ${p.preview_image_url
                ? `<img src="${p.preview_image_url}" alt="${p.title}" class="detail-hero" loading="eager">`
                : `<div class="detail-hero-placeholder">✨</div>`
            }

            <div style="margin-bottom:0.875rem;">
                ${p.categories ? `<span style="font-size:0.8rem;color:#a78bfa;font-weight:500;">✦ ${p.categories.name}</span>` : ''}
            </div>

            <h1 style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:800;letter-spacing:-0.03em;line-height:1.15;margin-bottom:0.5rem;">${p.title}</h1>
            ${p.description ? `<p style="color:var(--text-muted);font-size:1rem;line-height:1.65;margin-bottom:0;">${p.description}</p>` : ''}

            <div class="meta-row">
                <span class="badge badge-${p.difficulty}">${p.difficulty || 'intermediate'}</span>
                <span class="meta-item">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7s-8.268-2.943-9.542-7z"/></svg>
                    <span id="view-cnt">${p.view_count || 0}</span> views
                </span>
                <span class="meta-item">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    <span id="copy-cnt">${p.copy_count || 0}</span> copies
                </span>
            </div>

            <!-- Prompt Text -->
            <div style="margin-bottom:1.5rem;">
                <div class="prompt-box-label">Prompt</div>
                <div class="prompt-box" id="prompt-text-box">
                    <button id="main-copy-btn" class="copy-prompt-btn">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        Copy Prompt
                    </button>
                    ${p.prompt_text}
                </div>
            </div>

            ${p.negative_prompt ? `
            <div style="margin-bottom:1.5rem;">
                <div class="prompt-box-label" style="color:#f87171;">Negative Prompt</div>
                <div class="negative-box">${p.negative_prompt}</div>
            </div>
            ` : ''}

            ${p.tags?.length ? `
            <div>
                <div class="prompt-box-label">Tags</div>
                <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
                    ${p.tags.map(t => `<span class="tag-pill">#${t}</span>`).join('')}
                </div>
            </div>
            ` : ''}
        `;

        loader.style.display = 'none';
        content.style.display = 'block';

        document.getElementById('main-copy-btn').addEventListener('click', async () => {
            const btn = document.getElementById('main-copy-btn');
            await navigator.clipboard.writeText(p.prompt_text);
            toast.success('Prompt copied!');
            const orig = btn.innerHTML;
            btn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Copied!`;
            trackCopy(p.id);
            const cnt = document.getElementById('copy-cnt');
            if (cnt) cnt.textContent = parseInt(cnt.textContent) + 1;
            setTimeout(() => { btn.innerHTML = orig; }, 2500);
        });

    } catch (err) {
        loader.style.display = 'none';
        content.style.display = 'block';
        content.innerHTML = `<div style="text-align:center;padding:4rem;color:var(--text-muted)">${err.message}</div>`;
    }
}
