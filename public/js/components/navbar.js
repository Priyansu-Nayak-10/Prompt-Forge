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
        <a href="/login.html" class="nav-link auth-login" data-path="/login.html">Sign In</a>
        <a href="/signup.html" class="btn btn-primary auth-signup" style="padding:0.5rem 1rem;font-size:0.875rem;">Sign Up</a>
        <a href="/user-dashboard.html" class="nav-link auth-dashboard" style="display:none;" data-path="/user-dashboard.html">Dashboard</a>
        <button class="theme-toggle" aria-label="Toggle theme">
          <svg class="theme-icon-dark" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          <svg class="theme-icon-light" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
        </button>
      </div>
    </div>
  </nav>
`;

export const renderNavbar = () => {
    const container = document.getElementById('navbar-container');
    if (!container) return;
    container.innerHTML = navbarHtml;

    // Set active link
    const path = window.location.pathname;
    container.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.path && (path === link.dataset.path || (path === '/' && link.dataset.path === '/'))) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Check auth state
    const token = localStorage.getItem('sb_access_token');
    if (token) {
        const loginBtn = container.querySelector('.auth-login');
        const signupBtn = container.querySelector('.auth-signup');
        const dashBtn = container.querySelector('.auth-dashboard');
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (dashBtn) dashBtn.style.display = 'inline-flex';
    }
};
