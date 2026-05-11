const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

// POST /api/submissions — Public community submission
router.post('/', authLimiter, asyncHandler(async (req, res) => {
    const { title, prompt_text, description, difficulty, prompt_type, tags } = req.body;

    if (!title || !prompt_text) {
        return res.status(400).json({ success: false, error: { message: 'Title and prompt text are required.' } });
    }

    const { data, error } = await supabaseAdmin
        .from('submissions')
        .insert([{
            title,
            status: 'pending',
        }])
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
}));

module.exports = router;
