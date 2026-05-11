const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/auth.middleware');
const { validate, promptCreateSchema, promptUpdateSchema } = require('../middleware/validation.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { globalLimiter } = require('../middleware/rateLimiter.middleware');
const { supabaseAdmin } = require('../config/supabase');

// Apply admin auth and rate limit to all admin routes
router.use(globalLimiter);
router.use(asyncHandler(requireAdmin));

// GET /api/admin/prompts — list ALL prompts (all statuses) for dashboard
router.get('/prompts', asyncHandler(async (req, res) => {
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
}));

router.post(
    '/prompts',
    validate(promptCreateSchema, 'body'),
    asyncHandler(adminController.createPrompt)
);

router.put(
    '/prompts/:id',
    validate(promptUpdateSchema, 'body'),
    asyncHandler(adminController.updatePrompt)
);

router.delete(
    '/prompts/:id',
    asyncHandler(adminController.deletePrompt)
);

// GET /api/admin/submissions — list all submissions
router.get('/submissions', asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
}));

// PUT /api/admin/submissions/:id — update submission status (approve/reject)
router.put('/submissions/:id', asyncHandler(async (req, res) => {
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

    // If approved, automatically create the prompt in the prompts table
    if (status === 'approved') {
        // Need to fetch user profile or create a slug
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
}));

// GET /api/admin/users
router.get('/users', asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
}));

// GET /api/admin/analytics
router.get('/analytics', asyncHandler(async (req, res) => {
    // Basic stats: counts from tables
    const [promptsRes, subsRes, usersRes, savesRes, viewsRes, copiesRes] = await Promise.all([
        supabaseAdmin.from('prompts').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('submissions').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('saves').select('id', { count: 'exact', head: true }),
        supabaseAdmin.rpc('get_total_views'), // If this exists, otherwise sum in JS
        supabaseAdmin.rpc('get_total_copies')
    ]);

    // fallback for views/copies
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
            total_saves: savesRes.count || 0,
            total_views: totalViews,
            total_copies: totalCopies
        }
    });
}));

module.exports = router;
