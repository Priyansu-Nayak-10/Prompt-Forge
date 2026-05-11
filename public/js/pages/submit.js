import { submitPrompt, fetchCategories } from '../api.js';
import { toast, setButtonLoading } from '../core.js';
import { requireAuth } from '../auth.js';

const init = async () => {
    document.title = 'Submit Prompt — PromptForge';
    const user = await requireAuth();
    if (!user) return;

    const form = document.getElementById('submit-form');
    const errEl = document.getElementById('form-error');
    const catSelect = document.getElementById('sub-category');
    
    // Load categories
    try {
        const res = await fetchCategories();
        if (res.data) {
            catSelect.innerHTML = '<option value="">Select a Category</option>' + res.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }
    } catch (e) {
        console.warn('Failed to load categories', e);
    }

    const counter = (id, counterId, max) => {
        const el = document.getElementById(id);
        const c  = document.getElementById(counterId);
        el.addEventListener('input', () => {
            const n = el.value.length;
            c.textContent = `${n} / ${max}`;
            c.classList.toggle('warn', n > max * 0.9);
        });
    };
    counter('sub-title', 'title-counter', 100);
    counter('sub-prompt', 'prompt-counter', 5000);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.style.display = 'none';

        const title = document.getElementById('sub-title').value.trim();
        const pt    = document.getElementById('sub-prompt').value.trim();
        const category_id = catSelect.value;
        const tools_input = document.getElementById('sub-tools').value;

        if (!title || !pt) {
            errEl.textContent = 'Title and Prompt Text are required.';
            errEl.style.display = 'block';
            return;
        }

        const btn = document.getElementById('submit-btn');
        const restore = setButtonLoading(btn, 'Submitting...');
        try {
            await submitPrompt({
                title, 
                prompt_text: pt,
                description: document.getElementById('sub-description').value.trim() || undefined,
                difficulty:  document.getElementById('sub-difficulty').value,
                prompt_type: document.getElementById('sub-type').value,
                tags: document.getElementById('sub-tags').value.split(',').map(t => t.trim()).filter(Boolean),
                category_id: category_id || null,
                supported_tools: tools_input ? tools_input.split(',').map(t => t.trim()).filter(Boolean) : [],
            });
            document.getElementById('form-card').style.display = 'none';
            document.getElementById('success-card').style.display = 'block';
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
            restore();
        }
    });
};

document.addEventListener('DOMContentLoaded', init);
