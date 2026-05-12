import { fetchCategories, fetchTools } from '/js/api.js';
import { renderNavbar } from '/js/components/navbar.js';
import { renderFooter } from '/js/components/footer.js';

renderNavbar();
renderFooter();

const init = async () => {
    const categoriesGrid = document.getElementById('categories-grid');
    const toolsGrid      = document.getElementById('tools-grid');
    const toolsCount     = document.getElementById('tools-count-label');

    // ─── Categories ──────────────────────────────────────────────────────────
    if (categoriesGrid) {
        categoriesGrid.innerHTML = Array(8).fill(`
          <div class="cat-card" style="pointer-events:none;">
            <div class="cat-icon-wrap"><div class="skeleton" style="width:30px;height:30px;border-radius:6px;"></div></div>
            <div class="skeleton" style="height:15px;width:60%;"></div>
            <div class="skeleton" style="height:12px;width:40%;margin-top:4px;"></div>
          </div>
        `).join('');

        try {
            const res  = await fetchCategories();
            const cats = res?.data || [];

            if (!cats.length) {
                categoriesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:5rem;color:var(--text-muted)">No categories found.</div>`;
            } else {
                categoriesGrid.innerHTML = cats.map((cat, i) => `
                  <a href="/prompts.html?category=${cat.id}" class="cat-card animate-fade-up" style="animation-delay:${i * 0.04}s;">
                    <div class="cat-icon-wrap">${cat.icon || '🎨'}</div>
                    <div class="cat-name">${cat.name}</div>
                    <div class="cat-sub">${cat.prompt_count ? `${cat.prompt_count} prompts` : 'Browse prompts'}</div>
                    <div class="cat-arrow">
                      Browse
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </a>
                `).join('');
            }
        } catch {
            categoriesGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171;">Failed to load categories.</div>`;
        }
    }

    // ─── Tools ───────────────────────────────────────────────────────────────
    if (toolsGrid) {
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
            const res   = await fetchTools();
            const tools = res?.data || [];

            if (!tools.length) {
                toolsGrid.innerHTML = `
                  <div style="grid-column:1/-1;text-align:center;padding:5rem 2rem;color:var(--text-muted);">
                    <div style="font-size:2.5rem;margin-bottom:1rem;opacity:0.4;">🤖</div>
                    <div style="font-weight:600;color:var(--text);margin-bottom:0.4rem;">No tools yet</div>
                    <div style="font-size:0.875rem;">Tools will appear here once they are added.</div>
                  </div>`;
            } else {
                if (toolsCount) toolsCount.textContent = `${tools.length} AI tools available`;

                toolsGrid.innerHTML = tools.map((tool, i) => `
                  <a href="/prompts.html?tool=${encodeURIComponent(tool.name)}"
                     class="tool-card animate-fade-up" style="animation-delay:${i * 0.04}s;">
                    <div class="tool-icon">
                      ${tool.logo_url
                        ? `<img src="${tool.logo_url}" alt="${tool.name}">`
                        : `<span>${tool.icon || '🤖'}</span>`}
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
            }
        } catch {
            toolsGrid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171;">Failed to load tools.</div>`;
        }
    }
};

document.addEventListener('DOMContentLoaded', init);
