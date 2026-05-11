import { fetchPrompts, fetchCategories, fetchSavedPromptIds } from '../api.js';
import { promptCardHTML, attachCopyHandlers, attachSaveHandlers } from '../components/promptCard.js';
import { isAuthenticated } from '../auth.js';
import { renderPagination } from '../components/pagination.js';
import { showSkeletons, showEmpty, showError } from '../ui.js';

const grid       = document.getElementById('prompts-grid');
const pagEl      = document.getElementById('pagination');
const searchInput = document.getElementById('search-input');
const sortSelect  = document.getElementById('sort-select');
const catFilters  = document.getElementById('category-filters');

// ---- State ----
let state = {
    q:        '',
    sort:     'latest',
    category: '',
    tool:     '',
    page:     1,
    limit:    16,
};

// ---- Read URL params on load ----
const initFromURL = () => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('q'))        { state.q = p.get('q'); searchInput.value = state.q; }
    if (p.get('sort'))     { state.sort = p.get('sort'); sortSelect.value = state.sort; }
    if (p.get('category')) { state.category = p.get('category'); }
    if (p.get('tool'))     { state.tool = p.get('tool'); }
    if (p.get('page'))     { state.page = parseInt(p.get('page')) || 1; }
};

// ---- Push state to URL (for back/share) ----
const pushURL = () => {
    const p = new URLSearchParams();
    if (state.q)        p.set('q', state.q);
    if (state.sort !== 'latest') p.set('sort', state.sort);
    if (state.category) p.set('category', state.category);
    if (state.tool)     p.set('tool', state.tool);
    if (state.page > 1) p.set('page', String(state.page));
    history.replaceState({}, '', `${location.pathname}${p.size ? '?' + p : ''}`);
};

// ---- Load & render prompts ----
const loadPrompts = async () => {
    showSkeletons(grid, state.limit);
    pagEl.innerHTML = '';

    try {
        const res = await fetchPrompts(state);

        if (!res.data || res.data.length === 0) {
            showEmpty(grid, {
                icon: '🔍',
                title: 'No prompts found',
                message: state.q ? `No results for "${state.q}". Try a different keyword.` : 'No prompts available yet.',
            });
            return;
        }

        let savedIds = [];
        if (isAuthenticated()) {
            try {
                const saveRes = await fetchSavedPromptIds();
                if (saveRes.success) savedIds = saveRes.data || [];
            } catch (e) {
                console.warn('Failed to fetch saved IDs', e);
            }
        }

        grid.innerHTML = res.data.map(p => promptCardHTML({ ...p, isSaved: savedIds.includes(p.id) })).join('');
        attachCopyHandlers(grid);
        attachSaveHandlers(grid);
        renderPagination(pagEl, res.metadata, (newPage) => {
            state.page = newPage;
            pushURL();
            loadPrompts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        pushURL();
    } catch (err) {
        showError(grid, err.message, loadPrompts);
    }
};

// ---- Load categories into filter chips ----
const loadCategories = async () => {
    try {
        const res = await fetchCategories();
        if (!res?.data) return;

        res.data.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `chip${state.category === cat.id ? ' active' : ''}`;
            btn.dataset.category = cat.id;
            btn.textContent = `${cat.icon || ''} ${cat.name}`.trim();
            catFilters.appendChild(btn);
        });

        // Mark active chip from URL state
        updateCategoryChips();
    } catch {
        // Non-fatal — categories just won't be filterable
    }
};

const updateCategoryChips = () => {
    catFilters.querySelectorAll('.chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === state.category);
    });
};

// ---- Events ----
catFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    state.category = btn.dataset.category;
    state.page = 1;
    updateCategoryChips();
    loadPrompts();
});

let searchTimer;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.q    = searchInput.value.trim();
        state.page = 1;
        loadPrompts();
    }, 350);
});

sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    state.page = 1;
    loadPrompts();
});

// ---- Init ----
document.title = 'Explore AI Prompts — PromptForge';
initFromURL();
loadCategories();
loadPrompts();
