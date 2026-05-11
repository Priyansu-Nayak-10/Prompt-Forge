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

module.exports = router;
