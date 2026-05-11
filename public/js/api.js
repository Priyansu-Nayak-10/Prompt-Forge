export const API_BASE_URL = '/api';

/**
 * Central fetch wrapper with consistent error handling.
 * Returns parsed JSON or throws with server's error message.
 */
const request = async (url, options = {}) => {
    const headers = { ...options.headers };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }
    const res = await fetch(url, {
        ...options,
        headers,
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
 * Fetch all tools.
 */
export const fetchTools = async () => {
    return request(`${API_BASE_URL}/tools`);
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

const authHeader = () => {
    const token = localStorage.getItem('sb_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// --- Save / Bookmark APIs ---

export const fetchSavedPrompts = async () => {
    return request(`${API_BASE_URL}/saves`, { headers: authHeader() });
};

export const fetchSavedPromptIds = async () => {
    return request(`${API_BASE_URL}/saves/ids`, { headers: authHeader() });
};

export const toggleSave = async (promptId) => {
    return request(`${API_BASE_URL}/saves/toggle`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ promptId })
    });
};

// --- User Submissions APIs ---

export const fetchUserSubmissions = async () => {
    return request(`${API_BASE_URL}/submissions`, { headers: authHeader() });
};

export const submitPrompt = async (data) => {
    return request(`${API_BASE_URL}/submissions`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(data),
    });
};

// --- Admin APIs (requires Authorization header) ---

export const adminCreatePrompt = async (data) => {
    return request(`${API_BASE_URL}/admin/prompts`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify(data),
    });
};

export const fetchAdminSubmissions = async () => {
    return request(`${API_BASE_URL}/admin/submissions`, { headers: authHeader() });
};

export const updateSubmissionStatus = async (id, status, rejection_reason = '') => {
    return request(`${API_BASE_URL}/admin/submissions/${id}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({ status, rejection_reason }),
    });
};

export const fetchAdminUsers = async () => {
    return request(`${API_BASE_URL}/admin/users`, { headers: authHeader() });
};

export const fetchAdminAnalytics = async () => {
    return request(`${API_BASE_URL}/admin/analytics`, { headers: authHeader() });
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
