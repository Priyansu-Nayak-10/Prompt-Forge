/**
 * theme.js — Light/Dark theme toggle with localStorage persistence
 */

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
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = html.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  });
});

export { applyTheme };
