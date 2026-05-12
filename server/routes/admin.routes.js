const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middleware/auth.middleware');
const { validate, promptCreateSchema, promptUpdateSchema } = require('../middleware/validation.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { globalLimiter } = require('../middleware/rateLimiter.middleware');
const { supabaseAdmin } = require('../config/supabase');

// Apply admin auth and rate limit to all admin routes
router.use(globalLimiter);
router.use(asyncHandler(requireAdmin));

// GET /api/admin/prompts — list ALL prompts (all statuses) for dashboard
router.get('/prompts', asyncHandler(adminController.getPrompts));

router.post(
    '/prompts',
    validate(promptCreateSchema, 'body'),
    asyncHandler(adminController.createPrompt)
);

router.put(
    '/prompts/:id',
    validate(promptUpdateSchema, 'body'),
    asyncHandler(adminController.updatePrompt)
);

router.delete(
    '/prompts/:id',
    asyncHandler(adminController.deletePrompt)
);

// GET /api/admin/submissions — list all submissions
router.get('/submissions', asyncHandler(adminController.getSubmissions));

// PUT /api/admin/submissions/:id — update submission status (approve/reject)
router.put('/submissions/:id', asyncHandler(adminController.updateSubmissionStatus));

// GET /api/admin/users
router.get('/users', asyncHandler(adminController.getUsers));

// GET /api/admin/analytics
router.get('/analytics', asyncHandler(adminController.getAnalytics));

module.exports = router;
