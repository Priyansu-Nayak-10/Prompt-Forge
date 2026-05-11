import { fetchCategories } from '../api.js';

const init = async () => {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    // Skeletons
    grid.innerHTML = Array(8).fill(`
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
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:5rem;color:var(--text-muted)">No categories found.</div>`;
      } else {
        grid.innerHTML = cats.map((cat, i) => `
          <a href="/prompts.html?category=${cat.id}" class="cat-card animate-fade-up" style="animation-delay:${i * 0.04}s;">
            <div class="cat-icon">${cat.icon || '🎨'}</div>
            <div class="cat-name">${cat.name}</div>
            <div class="cat-sub">Browse prompts →</div>
          </a>
        `).join('');
      }
    } catch {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#f87171;">Failed to load categories.</div>`;
    }
};

document.addEventListener('DOMContentLoaded', init);
