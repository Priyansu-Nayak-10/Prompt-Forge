const { supabaseAdmin } = require('../config/supabase');
const { generateUniqueSlug } = require('./slug.service');
const { IMAGE_PROMPT_TYPE, IMAGE_TOOL_NAMES } = require('../constants/imagePlatform');

const PROMPT_SELECT_COLUMNS = 'id, title, slug, description, preview_image_url, tags, difficulty, prompt_type, view_count, copy_count, created_at, category_id, is_trending';
const PROMPT_SELECT_COLUMNS_NO_TRENDING = 'id, title, slug, description, preview_image_url, tags, difficulty, prompt_type, view_count, copy_count, created_at, category_id';


const buildPublishedPromptsQuery = ({ source, page, limit, q, category, sort, tool, includeTrending }) => {
    const start = (page - 1) * limit;
    const end   = start + limit - 1;

    let query = supabaseAdmin
        .from(source)
        .select(includeTrending ? PROMPT_SELECT_COLUMNS : PROMPT_SELECT_COLUMNS_NO_TRENDING, { count: 'exact' })
        .eq('status', 'published')
        .eq('prompt_type', IMAGE_PROMPT_TYPE);

    if (category) query = query.eq('category_id', category);
    if (tool && IMAGE_TOOL_NAMES.includes(tool)) query = query.contains('supported_tools', [tool]);
    if (tool && !IMAGE_TOOL_NAMES.includes(tool)) query = query.eq('id', '00000000-0000-0000-0000-000000000000');
    if (q)        query = query.ilike('search_vector', `%${q}%`);

    if (sort === 'trending' && includeTrending) {
        query = query
            .order('is_trending', { ascending: false })
            .order('view_count', { ascending: false })
            .order('created_at', { ascending: false });
    } else {
        query = query.order('created_at', { ascending: false });
    }

    return query.range(start, end);
};


const getPublishedPrompts = async ({ page, limit, q, category, sort, tool }) => {
    const source = q ? 'prompts_search_view' : 'prompts';

    try {
        const { data, count, error } = await buildPublishedPromptsQuery({ source, page, limit, q, category, sort, tool, includeTrending: true });
        if (error) throw error;

        return {
            data,
            metadata: { total: count, page, limit, totalPages: Math.ceil((count || 0) / limit) },
        };
    } catch (error) {
        const fallbackNeeded = sort === 'trending' && (
            error?.code === '42703' ||
            /is_trending|search_vector|view_count/i.test(error?.message || '')
        );

        if (!fallbackNeeded) throw error;

        const { data, count, error: fallbackError } = await buildPublishedPromptsQuery({ source, page, limit, q, category, sort: 'latest', tool, includeTrending: false });
        if (fallbackError) throw fallbackError;

        return {
            data,
            metadata: { total: count, page, limit, totalPages: Math.ceil((count || 0) / limit) },
        };
    }
};


const getPromptBySlug = async (slug) => {
    const { data, error } = await supabaseAdmin
        .from('prompts')
        .select('*, categories ( id, name, slug )')
        .eq('slug', slug)
        .eq('status', 'published')
        .eq('prompt_type', IMAGE_PROMPT_TYPE)
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
    promptData.prompt_type = IMAGE_PROMPT_TYPE;
    const { data, error } = await supabaseAdmin
        .from('prompts').insert([{ ...promptData, slug }]).select().single();
    if (error) throw error;
    return data;
};


const updatePrompt = async (id, promptData) => {
    if (promptData.prompt_type) promptData.prompt_type = IMAGE_PROMPT_TYPE;
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
