const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/tools
router.get('/', asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('tools')
        .select('id, name, slug, logo_url')
        .order('name');

    if (error) throw error;
    res.json({ success: true, data });
}));

module.exports = router;
