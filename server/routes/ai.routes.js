const express = require('express');
const router  = express.Router();
const aiController = require('../controllers/ai.controller');
const { requireUser } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const asyncHandler    = require('../utils/asyncHandler');

// POST /api/ai/optimize
// Restricted to authenticated users to prevent API abuse
router.post('/optimize', authLimiter, asyncHandler(requireUser), asyncHandler(aiController.optimizePrompt));

module.exports = router;
