const express = require('express');
const router  = express.Router();
const interactionController = require('../controllers/interaction.controller');
const { requireUser } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const asyncHandler    = require('../utils/asyncHandler');

// ─── Reviews ─────────────────────────────────────────────────────────────────
router.get('/reviews/:promptId', asyncHandler(interactionController.getPromptReviews));
router.post('/reviews/:promptId', asyncHandler(requireUser), asyncHandler(interactionController.createReview));
router.delete('/reviews/:id',     asyncHandler(requireUser), asyncHandler(interactionController.deleteReview));

// ─── AI Optimizer ────────────────────────────────────────────────────────────
router.post('/ai/optimize', authLimiter, asyncHandler(requireUser), asyncHandler(interactionController.optimizePrompt));

// ─── Stripe Checkout ─────────────────────────────────────────────────────────
router.post('/checkout/create-session', asyncHandler(requireUser), asyncHandler(interactionController.createCheckoutSession));

module.exports = router;
