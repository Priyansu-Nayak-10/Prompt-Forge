const { supabaseAdmin } = require('../config/supabase');
const { generateUniqueSlug } = require('./slug.service');

/**
 * Fetch all published prompts with pagination, search, and filtering
 */
const getPublishedPrompts = async ({ page, limit, q, category, sort, tool }) => {
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabaseAdmin
        .from('prompts')
        .select('id, title, slug, description, preview_image_url, tags, difficulty, view_count, copy_count, created_at, category_id', { count: 'exact' })
        .eq('status', 'published');

    if (category) {
        query = query.eq('category_id', category);
    }
    
    if (tool) {
        // Assuming supported_tools is a JSONB array or comma separated string
        query = query.ilike('supported_tools', `%${tool}%`);
    }

    if (q) {
        // MVP ilike search. Trigram GIN index in schema accelerates this.
        query = query.ilike('title', `%${q}%`); 
    }

    if (sort === 'trending') {
        query = query.order('is_trending', { ascending: false }).order('view_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(start, end);

    if (error) throw error;

    return {
        data,
        metadata: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        }
    };
};

/**
 * Fetch a single prompt by slug
 */
const getPromptBySlug = async (slug) => {
    const { data, error } = await supabaseAdmin
        .from('prompts')
        .select(`
            *,
            categories ( id, name, slug )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

    if (error) throw error;
    return data; // null if not found
};

/**
 * Increment the copy count for a prompt by ID.
 * Uses a single UPDATE query instead of fetch-then-update.
 */
const incrementCopyCount = async (id) => {
    const { error } = await supabaseAdmin.rpc('increment_copy_count', { prompt_id: id });
    if (error) {
        // RPC not available — fall back to read-modify-write
        const { data: current, error: fetchErr } = await supabaseAdmin
            .from('prompts')
            .select('copy_count')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;
        const { error: updateError } = await supabaseAdmin
            .from('prompts')
            .update({ copy_count: (current.copy_count || 0) + 1 })
            .eq('id', id);
        if (updateError) throw updateError;
    }
    return true;
};

const createPrompt = async (promptData) => {
    const slug = await generateUniqueSlug(promptData.title);
    const { data, error } = await supabaseAdmin
        .from('prompts')
        .insert([{ ...promptData, slug }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

const updatePrompt = async (id, promptData) => {
    const { data, error } = await supabaseAdmin
        .from('prompts')
        .update(promptData)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

const softDeletePrompt = async (id) => {
    const { error } = await supabaseAdmin
    .from('prompts')
    .update({ status: 'archived' })
    .eq('id', id);
    if (error) throw error;
    return true;
};

// --- Save / Bookmark Services ---

const toggleSave = async (userId, promptId) => {
    const { data: existing, error: checkError } = await supabaseAdmin
        .from('saves')
        .select('id')
        .eq('user_id', userId)
        .eq('prompt_id', promptId)
        .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
        const { error: deleteError } = await supabaseAdmin
            .from('saves')
            .delete()
            .eq('id', existing.id);
        if (deleteError) throw deleteError;
        return { saved: false };
    } else {
        const { error: insertError } = await supabaseAdmin
            .from('saves')
            .insert({ user_id: userId, prompt_id: promptId });
        if (insertError) throw insertError;
        return { saved: true };
    }
};

const getSavedPrompts = async (userId) => {
    const { data, error } = await supabaseAdmin
        .from('saves')
        .select(`
            id,
            prompt_id,
            created_at,
            prompts (
                id, title, slug, description, difficulty, preview_image_url
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(save => ({
        save_id: save.id,
        saved_at: save.created_at,
        ...save.prompts
    }));
};

const getSavedPromptIds = async (userId) => {
    const { data, error } = await supabaseAdmin
        .from('saves')
        .select('prompt_id')
        .eq('user_id', userId);
    if (error) throw error;
    return data.map(save => save.prompt_id);
};

module.exports = {
    getPublishedPrompts,
    getPromptBySlug,
    incrementCopyCount,
    createPrompt,
    updatePrompt,
    softDeletePrompt,
    toggleSave,
    getSavedPrompts,
    getSavedPromptIds
};
