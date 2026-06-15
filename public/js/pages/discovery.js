import { fetchTools } from '/js/api.js';

const init = async () => {
    const toolsGrid = document.getElementById('tools-grid');
    const toolsCount = document.getElementById('tools-count-label');

    if (!toolsGrid) return;

    toolsGrid.innerHTML = Array(6).fill(`
      <div class="tool-card" style="pointer-events:none;">
        <div class="tool-icon"><div class="skeleton" style="width:100%;height:100%;border-radius:8px;"></div></div>
        <div class="tool-info">
          <div class="skeleton" style="height:14px;width:55%;margin-bottom:6px;"></div>
          <div class="skeleton" style="height:11px;width:40%;"></div>
        </div>
      </div>
    `).join('');

    try {
        const res = await fetchTools();
        const tools = res?.data || [];

        if (!tools.length) {
            toolsGrid.innerHTML = `
              <div style="grid-column:1/-1;text-align:center;padding:5rem 2rem;color:var(--text-muted);">
                <div style="font-size:2.5rem;margin-bottom:1rem;opacity:0.4;">AI</div>
                <div style="font-weight:600;color:var(--text);margin-bottom:0.4rem;">No tools yet</div>
                <div style="font-size:0.875rem;">Tools will appear here once they are added.</div>
              </div>`;
            return;
        }

        if (toolsCount) toolsCount.textContent = `${tools.length} image tools available`;

        toolsGrid.innerHTML = tools.map((tool, i) => `
          <a href="/prompts.html?tool=${encodeURIComponent(tool.name)}"
             class="tool-card animate-fade-up" style="animation-delay:${i * 0.04}s;">
            <div class="tool-icon">
              ${tool.logo_url
                ? `<img src="${tool.logo_url}" alt="${tool.name}">`
                : `<span>${tool.icon || 'AI'}</span>`}
            </div>
            <div class="tool-info">
              <div class="tool-name">${tool.name}</div>
              <div class="tool-sub">${tool.prompt_count ? `${tool.prompt_count} prompts` : 'Browse prompts'}</div>
            </div>
            <div class="tool-arrow">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 18l6-6-6-6"/></svg>
            </div>
          </a>
        `).join('');
    } catch {
        toolsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171;">Failed to load tools.</div>`;
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
