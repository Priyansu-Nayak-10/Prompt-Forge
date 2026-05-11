const express = require('express');
const router  = express.Router();
const promptsController = require('../controllers/prompts.controller');
const { validate, paginationSchema } = require('../middleware/validation.middleware');
const asyncHandler      = require('../utils/asyncHandler');
const { analyticsLimiter } = require('../middleware/rateLimiter.middleware');
const { supabaseAdmin } = require('../config/supabase');

// GET /api/prompts
router.get('/', validate(paginationSchema, 'query'), asyncHandler(promptsController.getPrompts));

// POST /api/prompts/:id/copy  (must be before /:slug)
router.post('/:id/copy', analyticsLimiter, asyncHandler(promptsController.incrementCopy));

// POST /api/prompts/:id/view  — view tracking (rate-limited to prevent spam)
router.post('/:id/view', analyticsLimiter, asyncHandler(promptsController.incrementView));

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

// GET /api/prompts/:slug  (must be last)
router.get('/:slug', asyncHandler(promptsController.getPrompt));

module.exports = router;
