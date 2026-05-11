/**
 * toast.js — Premium toast, theme-aware
 */
let container = null;
const getContainer = () => {
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
};

const cfg = {
  success: { border: 'rgba(34,197,94,0.3)',  text: '#4ade80', icon: '✓', bg: 'rgba(34,197,94,0.1)' },
  error:   { border: 'rgba(239,68,68,0.3)',  text: '#f87171', icon: '✕', bg: 'rgba(239,68,68,0.1)' },
  info:    { border: 'rgba(124,77,255,0.3)', text: '#a78bfa', icon: 'ℹ', bg: 'rgba(124,77,255,0.1)' },
  warning: { border: 'rgba(251,146,60,0.3)', text: '#fb923c', icon: '⚠', bg: 'rgba(251,146,60,0.1)' },
};

const show = (message, type = 'info', duration = 3500) => {
  const c = getContainer();
  const { border, text, icon, bg } = cfg[type] || cfg.info;
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
  success: (m, d) => show(m, 'success', d),
  error:   (m, d) => show(m, 'error',   d),
  info:    (m, d) => show(m, 'info',    d),
  warning: (m, d) => show(m, 'warning', d),
};
