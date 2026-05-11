const express = require('express');
const router  = express.Router();
const userController = require('../controllers/user.controller');
const { requireUser }  = require('../middleware/auth.middleware');
const { authLimiter }  = require('../middleware/rateLimiter.middleware');
const asyncHandler     = require('../utils/asyncHandler');
const { supabaseAdmin } = require('../config/supabase');

// All user routes require authentication
router.use(asyncHandler(requireUser));

// --- Profile ---
// GET /api/user/me  — lightweight profile for navbar auth UX
router.get('/me', asyncHandler(async (req, res) => {
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

    res.json({
        success: true,
        data: {
            id:    req.user.id,
            email: req.user.email,
            role:  profile?.role || 'user',
        },
    });
}));

// --- Saves ---
router.get('/saves',         asyncHandler(userController.getSavedPrompts));
router.get('/saves/ids',     asyncHandler(userController.getSavedPromptIds));
router.post('/saves/toggle', asyncHandler(userController.toggleSave));

// --- Submissions ---
router.get('/submissions',              asyncHandler(userController.getSubmissions));
router.post('/submissions', authLimiter, asyncHandler(userController.submitPrompt));

module.exports = router;
