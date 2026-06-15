import { renderNavbar } from '/js/components/navbar.js?v=3.0';
import { renderFooter } from '/js/components/footer.js?v=3.0';

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

// Sync from server if logged in (lazy load to avoid blocking)
if (localStorage.getItem('sb_access_token')) {
  (async () => {
    try {
      const res = await fetch('/api/user/me', { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('sb_access_token')}` } 
      });
      const json = await res.json();
      if (json.success && json.data.theme) {
        applyTheme(json.data.theme);
      }
    } catch {}
  })();
}

// Wire toggle buttons after DOM ready
renderNavbar();
renderFooter();

// Apply theme icons to toggles
const current = html.getAttribute('data-theme') || 'dark';
applyTheme(current);

// Wire toggle buttons
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.theme-toggle');
  if (btn) {
    const activeTheme = html.getAttribute('data-theme') || 'dark';
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    
    // Sync to profile if logged in
    const token = localStorage.getItem('sb_access_token');
    if (token) {
      try {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ theme: newTheme })
        });
      } catch (err) {
        console.warn('Theme sync failed', err);
      }
    }
  }
});

export { applyTheme };
