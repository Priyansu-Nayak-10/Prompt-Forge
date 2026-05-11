
import { renderNavbar } from '/js/components/navbar.js';
import { renderFooter } from '/js/components/footer.js';

const STORAGE_KEY = 'pf-theme';
const html = document.documentElement;

const applyTheme = (theme) => {
  html.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  document.querySelectorAll('.theme-icon-dark').forEach(el => {
    el.style.display = theme === 'dark' ? 'block' : 'none';
  });
  document.querySelectorAll('.theme-icon-light').forEach(el => {
    el.style.display = theme === 'light' ? 'block' : 'none';
  });
};

// Apply saved theme immediately (before paint)
const saved = localStorage.getItem(STORAGE_KEY) || 'dark';
applyTheme(saved);

// Wire toggle buttons after DOM ready
renderNavbar();
renderFooter();

// Apply theme icons to toggles
const current = html.getAttribute('data-theme') || 'dark';
applyTheme(current);

// Wire toggle buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-toggle');
  if (btn) {
    const activeTheme = html.getAttribute('data-theme') || 'dark';
    applyTheme(activeTheme === 'dark' ? 'light' : 'dark');
  }
});

export { applyTheme };
