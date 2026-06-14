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
const submissionImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed.'), false);
        cb(null, true);
    }
});

// All user routes require authentication
router.use(asyncHandler(requireUser));

// --- Profile ---
router.get('/me', asyncHandler(userController.getMe));
router.put('/profile', asyncHandler(userController.updateProfile));
router.post('/avatar', upload.single('avatar'), asyncHandler(userController.uploadAvatar));

// --- Saves (Deprecated: migrating to collections but IDs still used for UI state) ---
router.get('/saves/ids',     asyncHandler(userController.getSavedPromptIds));

// --- Likes ---
router.get('/likes/ids',     asyncHandler(userController.getLikedPromptIds));
router.post('/likes/:promptId',   asyncHandler(userController.likePrompt));
router.delete('/likes/:promptId', asyncHandler(userController.unlikePrompt));

// --- Submissions ---
router.get('/submissions',              asyncHandler(userController.getSubmissions));
router.post('/submissions', authLimiter, asyncHandler(userController.submitPrompt));
router.post('/submissions/image', authLimiter, submissionImageUpload.single('image'), asyncHandler(userController.uploadSubmissionImage));

module.exports = router;
