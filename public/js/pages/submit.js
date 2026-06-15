import { submitPrompt, fetchCategories, uploadSubmissionImage } from '/js/api.js';
import { toast, setButtonLoading } from '/js/core.js';
import { requireAuth } from '/js/auth.js';

const IMAGE_TOOLS = ['Midjourney', 'FLUX', 'Stable Diffusion', 'Ideogram', 'DALL-E', 'Leonardo AI', 'Firefly'];

const init = async () => {
    document.title = 'Submit Image Prompt - PromptForge';
    const user = await requireAuth();
    if (!user) return;

    const form = document.getElementById('submit-form');
    const errEl = document.getElementById('form-error');
    const catSelect = document.getElementById('sub-category');
    const imageInput = document.getElementById('sample-image-input');
    const imageUrlInput = document.getElementById('sample-image-url');
    const uploadZone = document.getElementById('sample-upload-zone');
    const uploadEmpty = document.getElementById('sample-upload-empty');
    const imagePreview = document.getElementById('sample-image-preview');
    const uploadStatus = document.getElementById('image-upload-status');
    const toolOptions = document.getElementById('tool-options');
    const tagInput = document.getElementById('sub-tags');
    const tagPreview = document.getElementById('tag-preview');

    toolOptions.innerHTML = IMAGE_TOOLS.map(tool => `
        <label class="tool-option">
          <input type="checkbox" name="supported-tools" value="${tool}">
          ${tool}
        </label>
    `).join('');

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
        const c = document.getElementById(counterId);
        el.addEventListener('input', () => {
            const n = el.value.length;
            c.textContent = `${n} / ${max}`;
            c.classList.toggle('warn', n > max * 0.9);
        });
    };
    counter('sub-title', 'title-counter', 100);
    counter('sub-prompt', 'prompt-counter', 5000);

    const renderTags = () => {
        const tags = tagInput.value.split(',').map(t => t.trim()).filter(Boolean).slice(0, 12);
        tagPreview.innerHTML = tags.map(tag => `<span class="chip" style="font-size:0.75rem;padding:0.2rem 0.65rem;">${tag}</span>`).join('');
    };
    tagInput.addEventListener('input', renderTags);

    const uploadImage = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) return toast.error('Upload an image file.');

        uploadStatus.textContent = 'Uploading image...';
        uploadStatus.classList.remove('warn');
        imageUrlInput.value = '';

        const localPreview = URL.createObjectURL(file);
        imagePreview.src = localPreview;
        imagePreview.style.display = 'block';
        uploadEmpty.style.display = 'none';

        try {
            const res = await uploadSubmissionImage(file);
            imageUrlInput.value = res.url;
            imagePreview.src = res.url;
            uploadStatus.textContent = 'Sample output image uploaded';
            toast.success('Sample image uploaded.');
        } catch (err) {
            imageUrlInput.value = '';
            imagePreview.style.display = 'none';
            uploadEmpty.style.display = 'block';
            uploadStatus.textContent = err.message;
            uploadStatus.classList.add('warn');
            toast.error(err.message);
        } finally {
            URL.revokeObjectURL(localPreview);
        }
    };

    uploadZone.addEventListener('click', () => imageInput.click());
    uploadZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            imageInput.click();
        }
    });
    imageInput.addEventListener('change', () => uploadImage(imageInput.files[0]));
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragging');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragging'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragging');
        uploadImage(e.dataTransfer.files[0]);
    });

    const optimizeBtn = document.getElementById('ai-optimize-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errEl.style.display = 'none';

        const title = document.getElementById('sub-title').value.trim();
        const promptText = document.getElementById('sub-prompt').value.trim();
        const categoryId = catSelect.value;
        const selectedTools = Array.from(document.querySelectorAll('input[name="supported-tools"]:checked')).map(input => input.value);

        if (!title || !promptText || !categoryId || !imageUrlInput.value || selectedTools.length === 0) {
            errEl.textContent = 'Title, sample image, prompt, category, and at least one supported image tool are required.';
            errEl.style.display = 'block';
            return;
        }

        const btn = document.getElementById('submit-btn');
        const restore = setButtonLoading(btn, 'Submitting...');
        try {
            await submitPrompt({
                title,
                prompt_text: promptText,
                description: document.getElementById('sub-description').value.trim() || undefined,
                prompt_type: 'text-to-image',
                tags: tagInput.value.split(',').map(t => t.trim()).filter(Boolean),
                category_id: categoryId,
                supported_tools: selectedTools,
                preview_image_url: imageUrlInput.value,
            });
            form.reset();
            imageUrlInput.value = '';
            imagePreview.style.display = 'none';
            uploadEmpty.style.display = 'block';
            uploadStatus.textContent = 'No image uploaded';
            tagPreview.innerHTML = '';
            document.getElementById('form-card').style.display = 'none';
            document.getElementById('success-card').style.display = 'block';
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = 'block';
            restore();
        }
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
