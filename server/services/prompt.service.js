const { supabaseAdmin } = require('../config/supabase');
const { generateUniqueSlug } = require('./slug.service');


const getPublishedPrompts = async ({ page, limit, q, category, sort, tool }) => {
    const start = (page - 1) * limit;
    const end   = start + limit - 1;

    let query = supabaseAdmin
        .from(q ? 'prompts_search_view' : 'prompts')
        .select('id, title, slug, description, preview_image_url, tags, difficulty, view_count, copy_count, created_at, category_id, is_trending', { count: 'exact' })
        .eq('status', 'published');

    if (category) query = query.eq('category_id', category);
    if (tool)     query = query.contains('supported_tools', [tool]);
    if (q)        query = query.ilike('search_vector', `%${q}%`);

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


// --- Legacy Saves Removed ---


module.exports = {
    getPublishedPrompts,
    getPromptBySlug,
    incrementCopyCount,
    incrementViewCount,
    createPrompt,
    updatePrompt,
    softDeletePrompt,
};
