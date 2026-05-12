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
router.get('/me', asyncHandler(userController.getMe));

// --- Saves (Deprecated: migrating to collections but IDs still used for UI state) ---
router.get('/saves/ids',     asyncHandler(userController.getSavedPromptIds));

// --- Submissions ---
router.get('/submissions',              asyncHandler(userController.getSubmissions));
router.post('/submissions', authLimiter, asyncHandler(userController.submitPrompt));

module.exports = router;
