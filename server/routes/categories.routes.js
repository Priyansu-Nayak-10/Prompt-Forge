const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/categories
router.get('/', asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('categories')
        .select('id, name, slug, icon')
        .order('name');

    if (error) throw error;
    res.json({ success: true, data });
}));

module.exports = router;
