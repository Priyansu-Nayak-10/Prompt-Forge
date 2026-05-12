const promptService = require('../services/prompt.service');

const { supabaseAdmin } = require('../config/supabase');

const createPrompt = async (req, res) => {
    const prompt = await promptService.createPrompt(req.body);
    res.status(201).json({ success: true, data: prompt });
};

const updatePrompt = async (req, res) => {
    const prompt = await promptService.updatePrompt(req.params.id, req.body);
    res.status(200).json({ success: true, data: prompt });
};

const deletePrompt = async (req, res) => {
    await promptService.softDeletePrompt(req.params.id);
    res.status(200).json({ success: true, message: 'Prompt archived successfully' });
};

const getPrompts = async (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const q     = req.query.q || '';
    const start = (page - 1) * limit;
    const end   = start + limit - 1;

    let query = supabaseAdmin
        .from('prompts')
        .select('id, title, slug, status, copy_count, view_count, created_at, preview_image_url, difficulty, prompt_text', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (q) query = query.ilike('title', `%${q}%`);

    const { data, count, error } = await query.range(start, end);
    if (error) throw error;

    res.json({
        success: true,
        data,
        metadata: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        }
    });
};

const getSubmissions = async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
};

const updateSubmissionStatus = async (req, res) => {
    const { status, rejection_reason } = req.body;
    const { id } = req.params;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const { data, error } = await supabaseAdmin
        .from('submissions')
        .update({ status, rejection_reason })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    if (status === 'approved') {
        const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
        const { error: promptError } = await supabaseAdmin
            .from('prompts')
            .insert([{
                title: data.title,
                slug: slug,
                description: data.description,
                prompt_text: data.prompt_text,
                category_id: data.category_id,
                tags: data.tags,
                supported_tools: data.supported_tools,
                difficulty: data.difficulty,
                prompt_type: data.prompt_type,
                status: 'published'
            }]);
        
        if (promptError) console.error('Failed to auto-publish approved submission:', promptError);
    }

    res.json({ success: true, data });
};

const getUsers = async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
};

const getAnalytics = async (req, res) => {
    const [promptsRes, subsRes, usersRes, collectionsRes, viewsRes, copiesRes] = await Promise.all([
        supabaseAdmin.from('prompts').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('submissions').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('collections').select('id', { count: 'exact', head: true }),
        supabaseAdmin.rpc('get_total_views'),
        supabaseAdmin.rpc('get_total_copies')
    ]);

    let totalViews = 0;
    let totalCopies = 0;
    
    const { data: prompts } = await supabaseAdmin.from('prompts').select('view_count, copy_count');
    if (prompts) {
        totalViews = prompts.reduce((acc, p) => acc + (p.view_count || 0), 0);
        totalCopies = prompts.reduce((acc, p) => acc + (p.copy_count || 0), 0);
    }

    res.json({
        success: true,
        data: {
            total_prompts: promptsRes.count || 0,
            total_submissions: subsRes.count || 0,
            total_users: usersRes.count || 0,
            total_collections: collectionsRes.count || 0,
            total_views: totalViews,
            total_copies: totalCopies
        }
    });
};

module.exports = {
    createPrompt,
    updatePrompt,
    deletePrompt,
    getPrompts,
    getSubmissions,
    updateSubmissionStatus,
    getUsers,
    getAnalytics
};
