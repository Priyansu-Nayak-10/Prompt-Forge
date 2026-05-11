const { supabaseAdmin } = require('../config/supabase');
const { generateUniqueSlug } = require('./slug.service');


const getPublishedPrompts = async ({ page, limit, q, category, sort, tool }) => {
    const start = (page - 1) * limit;
    const end   = start + limit - 1;

    let query = supabaseAdmin
        .from('prompts')
        .select('id, title, slug, description, preview_image_url, tags, difficulty, view_count, copy_count, created_at, category_id, is_trending', { count: 'exact' })
        .eq('status', 'published');

    if (category) query = query.eq('category_id', category);
    if (tool)     query = query.ilike('supported_tools', `%${tool}%`);
    if (q)        query = query.ilike('title', `%${q}%`);

    if (sort === 'trending') {
        query = query
            .order('is_trending', { ascending: false })
            .order('view_count',  { ascending: false })
            .order('created_at',  { ascending: false });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    const { data, count, error } = await query.range(start, end);
    if (error) throw error;

    return {
        data,
        metadata: { total: count, page, limit, totalPages: Math.ceil((count || 0) / limit) },
    };
};


const getPromptBySlug = async (slug) => {
    const { data, error } = await supabaseAdmin
        .from('prompts')
        .select('*, categories ( id, name, slug )')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

    if (error) throw error;
    return data;
};


const incrementCopyCount = async (id) => {
    const { error } = await supabaseAdmin.rpc('increment_copy_count', { prompt_id: id });
    if (error) {
        // Fallback: read-modify-write
        const { data: current, error: fetchErr } = await supabaseAdmin
            .from('prompts').select('copy_count').eq('id', id).single();
        if (fetchErr) throw fetchErr;
        const { error: updateErr } = await supabaseAdmin
            .from('prompts').update({ copy_count: (current.copy_count || 0) + 1 }).eq('id', id);
        if (updateErr) throw updateErr;
    }
    return true;
};


const incrementViewCount = async (id) => {
    const { error } = await supabaseAdmin.rpc('increment_view_count', { prompt_id: id });
    if (error) {
        // Fallback: read-modify-write
        const { data: current, error: fetchErr } = await supabaseAdmin
            .from('prompts').select('view_count').eq('id', id).single();
        if (fetchErr) throw fetchErr;
        const { error: updateErr } = await supabaseAdmin
            .from('prompts').update({ view_count: (current.view_count || 0) + 1 }).eq('id', id);
        if (updateErr) throw updateErr;
    }
    return true;
};


const createPrompt = async (promptData) => {
    const slug = await generateUniqueSlug(promptData.title);
    const { data, error } = await supabaseAdmin
        .from('prompts').insert([{ ...promptData, slug }]).select().single();
    if (error) throw error;
    return data;
};


const updatePrompt = async (id, promptData) => {
    const { data, error } = await supabaseAdmin
        .from('prompts').update(promptData).eq('id', id).select().single();
    if (error) throw error;
    return data;
};


const softDeletePrompt = async (id) => {
    const { error } = await supabaseAdmin
        .from('prompts').update({ status: 'archived' }).eq('id', id);
    if (error) throw error;
    return true;
};


// --- Save / Bookmark ---

const toggleSave = async (userId, promptId) => {
    const { data: existing, error: checkErr } = await supabaseAdmin
        .from('saves').select('id').eq('user_id', userId).eq('prompt_id', promptId).maybeSingle();
    if (checkErr) throw checkErr;

    if (existing) {
        const { error: delErr } = await supabaseAdmin.from('saves').delete().eq('id', existing.id);
        if (delErr) throw delErr;
        return { saved: false };
    } else {
        const { error: insErr } = await supabaseAdmin
            .from('saves').insert({ user_id: userId, prompt_id: promptId });
        if (insErr) throw insErr;
        return { saved: true };
    }
};


const getSavedPrompts = async (userId) => {
    const { data, error } = await supabaseAdmin
        .from('saves')
        .select('id, prompt_id, created_at, prompts ( id, title, slug, description, difficulty, preview_image_url, is_trending )')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(save => ({ save_id: save.id, saved_at: save.created_at, ...save.prompts }));
};


const getSavedPromptIds = async (userId) => {
    const { data, error } = await supabaseAdmin
        .from('saves').select('prompt_id').eq('user_id', userId);
    if (error) throw error;
    return data.map(s => s.prompt_id);
};


module.exports = {
    getPublishedPrompts,
    getPromptBySlug,
    incrementCopyCount,
    incrementViewCount,
    createPrompt,
    updatePrompt,
    softDeletePrompt,
    toggleSave,
    getSavedPrompts,
    getSavedPromptIds,
};
