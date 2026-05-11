export const API_BASE_URL = '/api';

/**
 * Central fetch wrapper with consistent error handling.
 * Returns parsed JSON or throws with server's error message.
 */
const request = async (url, options = {}) => {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(json?.error?.message || `Request failed: ${res.status}`);
        err.status = res.status;
        throw err;
    }
    return json;
};

/**
 * Fetch published prompts with full filter + pagination support.
 * @param {Object} params - { q, category, sort, page, limit }
 */
export const fetchPrompts = async (params = {}) => {
    const query = new URLSearchParams();
    if (params.q)        query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    if (params.sort)     query.set('sort', params.sort);
    if (params.page)     query.set('page', String(params.page));
    if (params.limit)    query.set('limit', String(params.limit));

    const qs = query.toString();
    return request(`${API_BASE_URL}/prompts${qs ? `?${qs}` : ''}`);
};

/**
 * Fetch a single prompt by slug.
 */
export const fetchPromptBySlug = async (slug) => {
    return request(`${API_BASE_URL}/prompts/${encodeURIComponent(slug)}`);
};

/**
 * Fetch all categories.
 */
export const fetchCategories = async () => {
    return request(`${API_BASE_URL}/categories`);
};

/**
 * Increment copy count — uses prompt UUID to avoid slug route collision.
 * @param {string} id - Prompt UUID
 */
export const trackCopy = async (id) => {
    try {
        await request(`${API_BASE_URL}/prompts/${id}/copy`, { method: 'POST' });
        return true;
    } catch {
        return false; // Analytics failure is non-fatal
    }
};

// --- Admin APIs (requires Authorization header) ---

const authHeader = () => {
    const token = localStorage.getItem('sb_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const adminCreatePrompt = async (data) => {
    return request(`${API_BASE_URL}/admin/prompts`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(data),
    });
};

export const adminUpdatePrompt = async (id, data) => {
    return request(`${API_BASE_URL}/admin/prompts/${id}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify(data),
    });
};

export const adminDeletePrompt = async (id) => {
    return request(`${API_BASE_URL}/admin/prompts/${id}`, {
        method: 'DELETE',
        headers: authHeader(),
    });
};

export const adminUploadImage = async (file) => {
    const form = new FormData();
    form.append('image', file);
    return request(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: authHeader(), // No Content-Type — browser sets multipart boundary
        body: form,
    });
};
