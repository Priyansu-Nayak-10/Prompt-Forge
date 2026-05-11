import { getSession, signOut } from '/js/auth.js';
import { fetchUserProfile } from '/js/api.js';

// ─── Navbar HTML ───────────────────────────────────────────────────────────────
const navbarHtml = `
  <nav class="navbar">
    <div class="navbar-inner">
      <a href="/" class="logo">
        <div class="logo-icon">✨</div>
        Prompt<span>Forge</span>
      </a>

      <div class="nav-links">
        <a href="/" class="nav-link" data-path="/">Home</a>
        <a href="/prompts.html" class="nav-link" data-path="/prompts.html">Prompts</a>
        <a href="/categories.html" class="nav-link" data-path="/categories.html">Categories</a>
        <a href="/tools.html" class="nav-link" data-path="/tools.html">Tools</a>
        <a href="/submit.html" class="nav-cta">Submit Prompt</a>
      </div>

      <div class="nav-actions">
        <!-- Logged-out state -->
        <a href="/login.html" class="nav-link auth-login">Sign In</a>
        <a href="/signup.html" class="btn btn-primary auth-signup" style="padding:0.5rem 1rem;font-size:0.875rem;">Sign Up</a>

        <!-- Logged-in state (hidden until session confirmed) -->
        <div class="nav-avatar-wrap auth-user" style="display:none;">
          <button class="nav-avatar" id="nav-avatar-btn" aria-label="User menu" aria-haspopup="true" aria-expanded="false">
            <span id="nav-avatar-initial">?</span>
          </button>
          <div class="nav-dropdown" id="nav-dropdown" role="menu">
            <div class="dropdown-header" id="nav-dropdown-email">Loading…</div>
            <a href="/user-dashboard.html" class="dropdown-item">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
              My Dashboard
            </a>
            <a href="/submit.html" class="dropdown-item">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Submit Prompt
            </a>
            <a href="/dashboard.html" class="dropdown-item auth-admin-link" style="display:none;">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              Admin Dashboard
              <span class="admin-badge">Admin</span>
            </a>
            <div style="height:1px;background:var(--border);margin:0.25rem 0;"></div>
            <button class="dropdown-item danger" id="nav-signout-btn">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Sign Out
            </button>
          </div>
        </div>

        <button class="theme-toggle" aria-label="Toggle theme">
          <svg class="theme-icon-dark" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          <svg class="theme-icon-light" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        </button>

        <!-- Hamburger (mobile only) -->
        <button class="hamburger" id="hamburger-btn" aria-label="Open menu" aria-expanded="false">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>
    </div>
  </nav>

  <!-- Mobile Overlay -->
  <div class="nav-overlay" id="nav-overlay" role="presentation"></div>

  <!-- Mobile Drawer -->
  <div class="nav-drawer" id="nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
    <div class="drawer-header">
      <a href="/" class="logo" style="font-size:0.95rem;">
        <div class="logo-icon" style="width:26px;height:26px;font-size:0.8rem;">✨</div>
        Prompt<span>Forge</span>
      </a>
      <button class="drawer-close" id="drawer-close-btn" aria-label="Close menu">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <a href="/" class="drawer-link">🏠 Home</a>
    <a href="/prompts.html" class="drawer-link">✨ Prompts</a>
    <a href="/categories.html" class="drawer-link">📂 Categories</a>
    <a href="/tools.html" class="drawer-link">🔧 Tools</a>

    <div class="drawer-divider"></div>
    <a href="/submit.html" class="drawer-link">📝 Submit Prompt</a>

    <div class="drawer-divider"></div>
    <!-- Auth links injected dynamically -->
    <div id="drawer-auth-links">
      <a href="/login.html" class="drawer-link drawer-auth-logged-out">Sign In</a>
      <a href="/signup.html" class="drawer-link drawer-auth-logged-out" style="color:var(--primary);font-weight:600;">Sign Up Free</a>
      <a href="/user-dashboard.html" class="drawer-link drawer-auth-logged-in" style="display:none;">My Dashboard</a>
      <a href="/dashboard.html" class="drawer-link drawer-auth-admin" style="display:none;">Admin Dashboard</a>
      <button class="drawer-link danger drawer-auth-logged-in" id="drawer-signout-btn" style="display:none;">Sign Out</button>
    </div>
  </div>
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────
const openDrawer = (btn, overlay, drawer) => {
    overlay.classList.add('open');
    drawer.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
};

const closeDrawer = (btn, overlay, drawer) => {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
};

// ─── Auth UI ───────────────────────────────────────────────────────────────────
const updateAuthUI = async (container) => {
    const session = await getSession();

    if (!session) return; // defaults (logged-out) already in HTML

    // Hide login/signup
    container.querySelector('.auth-login')?.remove();
    container.querySelector('.auth-signup')?.remove();

    // Show avatar wrap
    const avatarWrap = container.querySelector('.auth-user');
    if (avatarWrap) avatarWrap.style.display = 'flex';

    // Set avatar initial from cached email
    const email = session.user?.email || '';
    const initial = email.charAt(0).toUpperCase() || '?';
    const avatarEl = container.querySelector('#nav-avatar-initial');
    if (avatarEl) avatarEl.textContent = initial;

    // Set dropdown email
    const emailEl = container.querySelector('#nav-dropdown-email');
    if (emailEl) emailEl.textContent = email;

    // Mobile drawer: show logged-in links
    container.querySelectorAll('.drawer-auth-logged-out').forEach(el => el.style.display = 'none');
    container.querySelectorAll('.drawer-auth-logged-in').forEach(el => el.style.display = 'flex');

    // Check admin role (non-blocking — runs in background)
    fetchUserProfile().then(res => {
        if (res?.data?.role === 'admin') {
            container.querySelectorAll('.auth-admin-link, .drawer-auth-admin').forEach(el => {
                el.style.display = 'flex';
            });
        }
    }).catch(() => {});
};

// ─── Main Render ───────────────────────────────────────────────────────────────
export const renderNavbar = () => {
    const container = document.getElementById('navbar-container');
    if (!container) return;
    container.innerHTML = navbarHtml;

    // Active link highlighting
    const path = window.location.pathname;
    container.querySelectorAll('.nav-link[data-path]').forEach(link => {
        link.classList.toggle('active', link.dataset.path === path);
    });

    // ── Avatar dropdown toggle ──
    const avatarBtn  = container.querySelector('#nav-avatar-btn');
    const dropdown   = container.querySelector('#nav-dropdown');
    if (avatarBtn && dropdown) {
        avatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = dropdown.classList.toggle('open');
            avatarBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.addEventListener('click', () => {
            dropdown.classList.remove('open');
            avatarBtn.setAttribute('aria-expanded', 'false');
        });
        dropdown.addEventListener('click', e => e.stopPropagation());
    }

    // ── Sign out (dropdown + drawer) ──
    const signoutHandler = async () => {
        await signOut();
        window.location.href = '/';
    };
    container.querySelector('#nav-signout-btn')?.addEventListener('click', signoutHandler);
    container.querySelector('#drawer-signout-btn')?.addEventListener('click', signoutHandler);

    // ── Mobile drawer ──
    const hamburger    = container.querySelector('#hamburger-btn');
    const overlay      = container.querySelector('#nav-overlay');
    const drawer       = container.querySelector('#nav-drawer');
    const closeBtn     = container.querySelector('#drawer-close-btn');

    if (hamburger && overlay && drawer) {
        hamburger.addEventListener('click', () => openDrawer(hamburger, overlay, drawer));
        closeBtn?.addEventListener('click',   () => closeDrawer(hamburger, overlay, drawer));
        overlay.addEventListener('click',     () => closeDrawer(hamburger, overlay, drawer));

        // Close on any drawer link click
        drawer.querySelectorAll('a.drawer-link').forEach(link => {
            link.addEventListener('click', () => closeDrawer(hamburger, overlay, drawer));
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('open')) {
                closeDrawer(hamburger, overlay, drawer);
            }
        });
    }

    // ── Async auth UI (non-blocking) ──
    updateAuthUI(container).catch(() => {});
};
