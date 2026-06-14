const footerHtml = `
  <footer class="footer">
    <div class="footer-inner">
      <a href="/" class="logo" style="font-size:1rem;">
        <div class="logo-icon" style="width:26px;height:26px;font-size:0.85rem;">✨</div>
        Prompt<span>Forge</span>
      </a>
      <div style="display:flex;gap:1.5rem;">
        <a href="/prompts.html" style="color:var(--text-muted);text-decoration:none;font-size:0.8125rem;">Prompts</a>
        <a href="/tools.html" style="color:var(--text-muted);text-decoration:none;font-size:0.8125rem;">Image Tools</a>
        <a href="/submit.html" style="color:var(--text-muted);text-decoration:none;font-size:0.8125rem;">Submit</a>
      </div>
      <span>© 2026 PromptForge. All rights reserved.</span>
    </div>
  </footer>
`;

export const renderFooter = () => {
    const container = document.getElementById('footer-container');
    if (!container) return;
    container.innerHTML = footerHtml;
};
