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

        // Send Welcome Email via Resend (optional/non-blocking)
        if (process.env.RESEND_API_KEY) {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            
            resend.emails.send({
                from: 'PromptForge <onboarding@resend.dev>',
                to: email,
                subject: 'Welcome to PromptForge! ✨',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h1 style="color: #6C3FE8;">Welcome to PromptForge!</h1>
                        <p>Thank you for joining our community of prompt engineers. You'll now receive our weekly digest of top-trending AI prompts.</p>
                        <p>In the meantime, start exploring our curated collections:</p>
                        <a href="${process.env.PUBLIC_URL || 'https://promptforge.com'}/prompts.html" style="display: inline-block; padding: 10px 20px; background-color: #6C3FE8; color: white; text-decoration: none; border-radius: 5px;">Explore Prompts</a>
                    </div>
                `
            }).catch(err => console.error('Email failed:', err));
        }

        res.status(201).json({ success: true, message: 'Successfully subscribed to the newsletter!' });
    })
);

module.exports = router;
