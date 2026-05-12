const express = require('express');
const router  = express.Router();
const userController = require('../controllers/user.controller');
const { requireUser }  = require('../middleware/auth.middleware');
const { authLimiter }  = require('../middleware/rateLimiter.middleware');
const asyncHandler     = require('../utils/asyncHandler');
const { supabaseAdmin } = require('../config/supabase');

const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB for avatars
});

// All user routes require authentication
router.use(asyncHandler(requireUser));

// --- Profile ---
router.get('/me', asyncHandler(userController.getMe));
router.put('/profile', asyncHandler(userController.updateProfile));
router.post('/avatar', upload.single('avatar'), asyncHandler(userController.uploadAvatar));

// --- Saves (Deprecated: migrating to collections but IDs still used for UI state) ---
router.get('/saves/ids',     asyncHandler(userController.getSavedPromptIds));

// --- Submissions ---
router.get('/submissions',              asyncHandler(userController.getSubmissions));
router.post('/submissions', authLimiter, asyncHandler(userController.submitPrompt));

module.exports = router;
