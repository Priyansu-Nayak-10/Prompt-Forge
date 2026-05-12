const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { body, validationResult } = require('express-validator');

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe an email to the newsletter
// @access  Public
router.post(
    '/subscribe',
    [body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail()],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email } = req.body;

        // Insert into subscribers table
        const { error } = await supabaseAdmin.from('subscribers').insert({ email });

        if (error) {
            // Check if it's a unique constraint violation (duplicate email)
            if (error.code === '23505' || error.message.includes('duplicate key value')) {
                return res.status(400).json({ success: false, error: 'You are already subscribed!' });
            }
            throw error;
        }

        res.status(201).json({ success: true, message: 'Successfully subscribed to the newsletter!' });
    })
);

module.exports = router;
