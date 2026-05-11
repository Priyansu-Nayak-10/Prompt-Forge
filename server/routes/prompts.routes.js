const express = require('express');
const router = express.Router();
const promptsController = require('../controllers/prompts.controller');
const { validate, paginationSchema, slugParamSchema } = require('../middleware/validation.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { analyticsLimiter } = require('../middleware/rateLimiter.middleware');
const { supabaseAdmin } = require('../config/supabase');

// GET /api/prompts - Fetch public published prompts with pagination/filtering
router.get(
    '/',
    validate(paginationSchema, 'query'),
    asyncHandler(promptsController.getPrompts)
);

// POST /api/prompts/:id/copy - Increment copy count (MUST be before /:slug to avoid conflict)
router.post(
    '/:id/copy',
    analyticsLimiter,
    asyncHandler(promptsController.incrementCopy)
);

// GET /api/prompts/:slug - Fetch a single prompt by slug (MUST be last)
router.get(
    '/:slug',
    asyncHandler(promptsController.getPrompt)
);

// --- Discovery Routes (Merged from separate files) ---

// GET /api/prompts/discovery/categories
router.get('/discovery/categories', asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin.from('categories').select('id, name, slug, icon').order('name');
    if (error) throw error;
    res.json({ success: true, data });
}));

// GET /api/prompts/discovery/tools
router.get('/discovery/tools', asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin.from('tools').select('id, name, slug, logo_url').order('name');
    if (error) throw error;
    res.json({ success: true, data });
}));

module.exports = router;
