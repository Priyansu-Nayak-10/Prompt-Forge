/**
 * core.js — Consolidated UI and Toast utilities
 */

// --- Toast Logic ---
let toastContainer = null;
const getToastContainer = () => {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
};

const toastCfg = {
    success: { border: 'rgba(34,197,94,0.3)',  text: '#4ade80', icon: '✓', bg: 'rgba(34,197,94,0.1)' },
    error:   { border: 'rgba(239,68,68,0.3)',  text: '#f87171', icon: '✕', bg: 'rgba(239,68,68,0.1)' },
    info:    { border: 'rgba(124,77,255,0.3)', text: '#a78bfa', icon: 'ℹ', bg: 'rgba(124,77,255,0.1)' },
    warning: { border: 'rgba(251,146,60,0.3)', text: '#fb923c', icon: '⚠', bg: 'rgba(251,146,60,0.1)' },
};

const showToast = (message, type = 'info', duration = 3500) => {
    const c = getToastContainer();
    const { border, text, icon } = toastCfg[type] || toastCfg.info;
    const el = document.createElement('div');
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    el.style.cssText = `
        display:flex;align-items:center;gap:0.75rem;
        padding:0.8rem 1.125rem;
        background:${isDark ? 'rgba(17,17,38,0.95)' : 'rgba(255,255,255,0.98)'};
        border:1px solid ${border};
        border-left:3px solid ${text};
        border-radius:0.75rem;
        backdrop-filter:blur(16px);
        color:${isDark ? '#eeeeff' : '#0f0f1e'};
        font-size:0.875rem;font-weight:500;
        box-shadow:0 8px 32px rgba(0,0,0,0.2);
        pointer-events:auto;
        opacity:0;transform:translateX(12px);
        transition:opacity 0.22s ease,transform 0.22s ease;
        font-family:'Inter',sans-serif;
        max-width:320px;min-width:200px;
    `;
    el.innerHTML = `<span style="color:${text};font-size:1rem;flex-shrink:0;">${icon}</span><span>${message}</span>`;
    c.appendChild(el);

    requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(0)'; });
    setTimeout(() => {
        el.style.opacity = '0'; el.style.transform = 'translateX(12px)';
        el.addEventListener('transitionend', () => el.remove(), { once: true });
    }, duration);
};

export const toast = {
    success: (m, d) => showToast(m, 'success', d),
    error:   (m, d) => showToast(m, 'error',   d),
    info:    (m, d) => showToast(m, 'info',    d),
    warning: (m, d) => showToast(m, 'warning', d),
};

// --- UI Logic ---

export const showSkeletons = (container, count = 8) => {
    container.innerHTML = Array.from({ length: count }, () => `
        <div class="prompt-card" style="pointer-events:none;">
            <div class="card-image"><div class="skeleton" style="width:100%;height:100%;"></div></div>
            <div class="card-body" style="gap:0.75rem;">
                <div class="skeleton" style="height:16px;width:75%;"></div>
                <div class="skeleton" style="height:12px;width:100%;"></div>
                <div class="skeleton" style="height:12px;width:60%;"></div>
                <div style="display:flex;justify-content:space-between;margin-top:auto;">
                    <div class="skeleton" style="height:22px;width:70px;border-radius:99px;"></div>
                    <div class="skeleton" style="height:28px;width:28px;border-radius:6px;"></div>
                </div>
            </div>
        </div>
    `).join('');
};

export const showEmpty = (container, { icon = '🔍', title = 'Nothing found', message = 'Try a different search.' } = {}) => {
    container.innerHTML = `
        <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5rem 2rem;text-align:center;">
            <div style="font-size:3.5rem;margin-bottom:1.25rem;opacity:0.6;">${icon}</div>
            <div style="font-size:1.125rem;font-weight:600;color:#fff;margin-bottom:0.5rem;">${title}</div>
            <div style="font-size:0.875rem;color:var(--text-muted);max-width:320px;">${message}</div>
        </div>
    `;
};

export const showError = (container, message = 'Something went wrong.', onRetry = null) => {
    container.innerHTML = `
        <div style="grid-column:1/-1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5rem 2rem;text-align:center;">
            <div style="font-size:3rem;margin-bottom:1.25rem;opacity:0.5;">⚠️</div>
            <div style="font-size:1.125rem;font-weight:600;color:#fff;margin-bottom:0.5rem;">Failed to load</div>
            <div style="font-size:0.875rem;color:var(--text-muted);max-width:320px;margin-bottom:${onRetry ? '1.5rem' : '0'}">${message}</div>
            ${onRetry ? `<button id="retry-btn" class="btn btn-secondary btn-sm">Try again</button>` : ''}
        </div>
    `;
    if (onRetry) document.getElementById('retry-btn')?.addEventListener('click', onRetry);
};

export const setButtonLoading = (btn, text = 'Loading...') => {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span style="opacity:0.7">${text}</span>`;
    return () => { btn.disabled = false; btn.innerHTML = original; };
};

export const difficultyBadge = (d = 'intermediate') => {
    const cls = { beginner: 'badge-beginner', intermediate: 'badge-intermediate', advanced: 'badge-advanced' };
    return `<span class="badge ${cls[d] || cls.intermediate}">${d}</span>`;
};
