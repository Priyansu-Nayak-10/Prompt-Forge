const express = require('express');
const router = express.Router();
const promptsController = require('../controllers/prompts.controller');
const { validate, paginationSchema, slugParamSchema } = require('../middleware/validation.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { analyticsLimiter } = require('../middleware/rateLimiter.middleware');

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

module.exports = router;
