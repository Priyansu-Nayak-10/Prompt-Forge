import { fetchPrompts, fetchTools, fetchSavedPromptIds, fetchLikedPromptIds } from '/js/api.js';
import { promptCardHTML, attachCopyHandlers } from '/js/components/promptCard.js';
import { isAuthenticated } from '/js/auth.js';
import { renderPagination } from '/js/components/pagination.js';
import { showSkeletons, showEmpty, showError } from '/js/core.js';

const grid = document.getElementById('prompts-grid');
const pagEl = document.getElementById('pagination');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const toolFilters = document.getElementById('tool-filters');
const resultsMeta = document.getElementById('results-meta');

let state = {
    q: '',
    sort: 'latest',
    tool: '',
    page: 1,
    limit: 16,
};

const initFromURL = () => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('q')) { state.q = p.get('q'); searchInput.value = state.q; }
    if (p.get('sort')) { state.sort = p.get('sort'); sortSelect.value = state.sort; }
    if (p.get('tool')) state.tool = p.get('tool');
    if (p.get('page')) state.page = parseInt(p.get('page')) || 1;
};

const pushURL = () => {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.sort !== 'latest') p.set('sort', state.sort);
    if (state.tool) p.set('tool', state.tool);
    if (state.page > 1) p.set('page', String(state.page));
    history.replaceState({}, '', `${location.pathname}${p.size ? '?' + p : ''}`);
};

const updateResultsMeta = (metadata = {}) => {
    if (!resultsMeta) return;

    const total = metadata.total ?? 0;
    const label = total === 1 ? 'image prompt' : 'image prompts';
    const context = [];

    if (state.q) context.push(`for "${state.q}"`);
    if (state.tool) context.push(`using ${state.tool}`);

    resultsMeta.textContent = `${total.toLocaleString()} ${label} found${context.length ? ` ${context.join(' ')}` : ''}`;
};

const loadPrompts = async () => {
    showSkeletons(grid, state.limit);
    pagEl.innerHTML = '';
    if (resultsMeta) resultsMeta.textContent = '';

    try {
        const res = await fetchPrompts(state);
        updateResultsMeta(res.metadata);

        if (!res.data || res.data.length === 0) {
            showEmpty(grid, {
                icon: 'IMG',
                title: 'No image prompts found',
                message: state.q ? `No image prompts matched "${state.q}". Try another visual style, subject, or tool.` : 'No image prompts available yet.',
            });
            return;
        }

        let savedIds = [];
        let likedIds = [];
        if (await isAuthenticated()) {
            try {
                const [saveRes, likeRes] = await Promise.all([
                    fetchSavedPromptIds().catch(() => ({ success: false, data: [] })),
                    fetchLikedPromptIds().catch(() => ({ success: false, data: [] }))
                ]);
                if (saveRes.success) savedIds = saveRes.data || [];
                if (likeRes.success) likedIds = likeRes.data || [];
            } catch (e) {
                console.warn('Failed to fetch saved or liked IDs', e);
            }
        }

        grid.innerHTML = res.data.map(p => promptCardHTML({
            ...p,
            isSaved: savedIds.includes(p.id),
            isLiked: likedIds.includes(p.id)
        })).join('');
        attachCopyHandlers(grid);
        renderPagination(pagEl, res.metadata, (newPage) => {
            state.page = newPage;
            pushURL();
            loadPrompts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        pushURL();
    } catch (err) {
        if (resultsMeta) resultsMeta.textContent = '';
        showError(grid, err.message, loadPrompts);
    }
};

const loadTools = async () => {
    if (!toolFilters) return;
    try {
        const res = await fetchTools();
        if (!res?.data) return;

        res.data.forEach(tool => {
            const btn = document.createElement('button');
            btn.className = `chip${state.tool === tool.name ? ' active' : ''}`;
            btn.dataset.tool = tool.name;
            btn.textContent = tool.name;
            toolFilters.appendChild(btn);
        });

        updateToolChips();
    } catch {
        // Non-fatal: tools just will not be filterable.
    }
};

const updateToolChips = () => {
    if (!toolFilters) return;
    toolFilters.querySelectorAll('.chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === state.tool);
    });
};

toolFilters?.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    state.tool = btn.dataset.tool;
    state.page = 1;
    updateToolChips();
    loadPrompts();
});

let searchTimer;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.q = searchInput.value.trim();
        state.page = 1;
        loadPrompts();
    }, 350);
});

sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    state.page = 1;
    loadPrompts();
});

document.title = 'Explore Image Prompts - PromptForge';
initFromURL();
loadTools();
loadPrompts();
