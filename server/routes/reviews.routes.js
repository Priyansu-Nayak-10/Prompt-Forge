const express = require('express');
const router  = express.Router();
const reviewsController = require('../controllers/reviews.controller');
const { requireUser }   = require('../middleware/auth.middleware');
const asyncHandler      = require('../utils/asyncHandler');

// Public: View reviews
router.get('/:promptId', asyncHandler(reviewsController.getPromptReviews));

// Private: Create/Delete reviews
router.post('/:promptId', asyncHandler(requireUser), asyncHandler(reviewsController.createReview));
router.delete('/:id',     asyncHandler(requireUser), asyncHandler(reviewsController.deleteReview));

module.exports = router;
