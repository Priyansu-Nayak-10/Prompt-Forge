/**
 * ui.js — Shared UI utilities with design system CSS
 */

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
