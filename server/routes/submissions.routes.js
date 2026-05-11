const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

// POST /api/submissions — Public community submission
router.post('/', authLimiter, asyncHandler(async (req, res) => {
    const { title, prompt_text, description, difficulty, prompt_type, tags, category_id, supported_tools } = req.body;

    if (!title || !prompt_text) {
        return res.status(400).json({ success: false, error: { message: 'Title and prompt text are required.' } });
    }

    // Try to get user if auth header is present
    let user_id = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) user_id = user.id;
    }

    const { data, error } = await supabaseAdmin
        .from('submissions')
        .insert([{
            title,
            prompt_text,
            description,
            difficulty: difficulty || 'intermediate',
            prompt_type: prompt_type || 'text-to-image',
            tags: Array.isArray(tags) ? tags : [],
            category_id,
            supported_tools: Array.isArray(supported_tools) ? supported_tools : [],
            status: 'pending',
            user_id
        }])
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
}));

// GET /api/submissions - Fetch submissions for admin OR user
router.get('/', asyncHandler(async (req, res) => {
    // If admin, fetch all (or based on query). If user, fetch their own.
    // For now, let's keep it simple and just do what we need.
    // Actually, Admin will use /api/admin/submissions.
    // So this is for the user dashboard.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { data, error } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data });
}));

module.exports = router;
