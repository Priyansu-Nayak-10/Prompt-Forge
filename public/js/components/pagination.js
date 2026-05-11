
export const renderPagination = (container, { page, totalPages, total }, onPageChange) => {
  container.innerHTML = '';
  if (!totalPages || totalPages <= 1) return;

  const makeBtn = (label, targetPage, disabled = false, active = false) => {
    const el = document.createElement('button');
    el.textContent = label;
    el.disabled = disabled;
    el.className = [
      'btn btn-sm',
      active ? 'btn-primary' : 'btn-secondary',
      disabled ? '' : ''
    ].join(' ').trim();
    if (!disabled && !active) el.addEventListener('click', () => onPageChange(targetPage));
    return el;
  };

  container.appendChild(makeBtn('←', page - 1, page <= 1));

  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);

  if (start > 1) {
    container.appendChild(makeBtn('1', 1));
    if (start > 2) {
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.style.cssText = 'padding:0 0.25rem;color:var(--text-muted);line-height:1;align-self:center;';
      container.appendChild(dots);
    }
  }

  for (let i = start; i <= end; i++) {
    container.appendChild(makeBtn(String(i), i, false, i === page));
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.style.cssText = 'padding:0 0.25rem;color:var(--text-muted);line-height:1;align-self:center;';
      container.appendChild(dots);
    }
    container.appendChild(makeBtn(String(totalPages), totalPages));
  }

  container.appendChild(makeBtn('→', page + 1, page >= totalPages));

  const info = document.createElement('span');
  info.textContent = `${total?.toLocaleString()} total`;
  info.style.cssText = 'font-size:0.78rem;color:var(--text-muted);margin-left:0.5rem;align-self:center;';
  container.appendChild(info);
};
