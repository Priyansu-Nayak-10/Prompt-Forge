const express = require('express');
const router = express.Router();
const savesController = require('../controllers/saves.controller');
const { requireUser } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

// Require authentication for all save routes
router.use(requireUser);

// GET /api/saves - Get all saved prompts for the current user
router.get(
    '/',
    asyncHandler(savesController.getSavedPrompts)
);

// GET /api/saves/ids - Get just the IDs of saved prompts (useful for UI state)
router.get(
    '/ids',
    asyncHandler(savesController.getSavedPromptIds)
);

// POST /api/saves/toggle - Toggle save state for a prompt
router.post(
    '/toggle',
    asyncHandler(savesController.toggleSave)
);

module.exports = router;
