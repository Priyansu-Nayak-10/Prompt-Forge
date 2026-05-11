import { fetchTools } from '../api.js';

const init = async () => {
    const grid = document.getElementById('tools-grid');
    if (!grid) return;

    // Skeleton loaders
    grid.innerHTML = Array(6).fill(`
      <div class="tool-card" style="pointer-events:none;">
        <div class="tool-icon"><div class="skeleton" style="width:100%;height:100%;border-radius:8px;"></div></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:0.5rem;">
          <div class="skeleton" style="height:14px;width:55%;"></div>
          <div class="skeleton" style="height:11px;width:40%;"></div>
        </div>
      </div>
    `).join('');

    try {
      const res   = await fetchTools();
      const tools = res?.data || [];

      if (!tools.length) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:5rem 2rem;color:var(--text-muted);">
            <div style="font-size:2.5rem;margin-bottom:1rem;opacity:0.5;">🤖</div>
            <div style="font-weight:600;color:var(--text);margin-bottom:0.4rem;">No tools yet</div>
            <div style="font-size:0.875rem;">Tools will appear here once they are added.</div>
          </div>`;
        return;
      }

      grid.innerHTML = tools.map((tool, i) => `
        <a href="/prompts.html?tool=${encodeURIComponent(tool.name)}" class="tool-card animate-fade-up" style="animation-delay:${i * 0.04}s;">
          <div class="tool-icon">
            ${tool.logo_url
              ? `<img src="${tool.logo_url}" alt="${tool.name}" style="width:100%;height:100%;object-fit:contain;padding:0.5rem;">`
              : `<span>🤖</span>`}
          </div>
          <div>
            <div class="tool-name">${tool.name}</div>
            <div class="tool-sub">Browse prompts →</div>
          </div>
        </a>
      `).join('');
    } catch {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171;">Failed to load tools.</div>`;
    }
};

document.addEventListener('DOMContentLoaded', init);
