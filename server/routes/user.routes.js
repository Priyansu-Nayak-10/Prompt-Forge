const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { requireUser } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const asyncHandler = require('../utils/asyncHandler');

// Require authentication for all user routes
router.use(asyncHandler(requireUser));

// --- Saves ---
router.get('/saves', asyncHandler(userController.getSavedPrompts));
router.get('/saves/ids', asyncHandler(userController.getSavedPromptIds));
router.post('/saves/toggle', asyncHandler(userController.toggleSave));

// --- Submissions ---
router.get('/submissions', asyncHandler(userController.getSubmissions));
router.post('/submissions', authLimiter, asyncHandler(userController.submitPrompt));

module.exports = router;
