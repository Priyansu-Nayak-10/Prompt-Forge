import { fetchCategories, fetchTools } from '/js/api.js';

const init = async () => {
    const categoriesGrid = document.getElementById('categories-grid');
    const toolsGrid = document.getElementById('tools-grid');

    if (categoriesGrid) {
        // Skeletons
        categoriesGrid.innerHTML = Array(8).fill(`
          <div class="cat-card" style="pointer-events:none;">
            <div class="skeleton" style="width:44px;height:44px;border-radius:8px;margin-bottom:1rem;"></div>
            <div class="skeleton" style="height:16px;width:60%;margin-bottom:0.5rem;"></div>
            <div class="skeleton" style="height:12px;width:40%;"></div>
          </div>
        `).join('');

        try {
            const res = await fetchCategories();
            const cats = res?.data || [];
            if (!cats.length) {
                categoriesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:5rem;color:var(--text-muted)">No categories found.</div>`;
            } else {
                categoriesGrid.innerHTML = cats.map((cat, i) => `
                  <a href="/prompts.html?category=${cat.id}" class="cat-card animate-fade-up" style="animation-delay:${i * 0.04}s;">
                    <div class="cat-icon">${cat.icon || '🎨'}</div>
                    <div class="cat-name">${cat.name}</div>
                    <div class="cat-sub">Browse prompts →</div>
                  </a>
                `).join('');
            }
        } catch {
            categoriesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171;">Failed to load categories.</div>`;
        }
    }

    if (toolsGrid) {
        // Skeleton loaders
        toolsGrid.innerHTML = Array(6).fill(`
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
                toolsGrid.innerHTML = `
                  <div style="grid-column:1/-1;text-align:center;padding:5rem 2rem;color:var(--text-muted);">
                    <div style="font-size:2.5rem;margin-bottom:1rem;opacity:0.5;">🤖</div>
                    <div style="font-weight:600;color:var(--text);margin-bottom:0.4rem;">No tools yet</div>
                    <div style="font-size:0.875rem;">Tools will appear here once they are added.</div>
                  </div>`;
            } else {
                toolsGrid.innerHTML = tools.map((tool, i) => `
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
            }
        } catch {
            toolsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171;">Failed to load tools.</div>`;
        }
    }
};

document.addEventListener('DOMContentLoaded', init);
