import { submitPrompt, fetchCategories } from '/js/api.js';
import { toast, setButtonLoading } from '/js/core.js';
import { requireAuth } from '/js/auth.js';

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

    // AI Optimize
    const optimizeBtn = document.getElementById('ai-optimize-btn');
    optimizeBtn?.addEventListener('click', async () => {
        const promptInput = document.getElementById('sub-prompt');
        const text = promptInput.value.trim();
        if (!text) return toast.error('Enter a prompt first to optimize it!');
        
        const originalText = optimizeBtn.innerHTML;
        optimizeBtn.disabled = true;
        optimizeBtn.textContent = '...';
        
        try {
            const token = localStorage.getItem('sb_access_token');
            const res = await fetch('/api/ai/optimize', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ prompt: text })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Optimization failed');
            
            promptInput.value = json.optimized;
            // Update char counter manually
            const n = promptInput.value.length;
            const c = document.getElementById('prompt-counter');
            if (c) c.textContent = `${n} / 5000`;
            
            toast.success('Prompt optimized by AI! ✨');
        } catch (err) {
            toast.error(err.message);
        } finally {
            optimizeBtn.disabled = false;
            optimizeBtn.innerHTML = originalText;
        }
    });

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
