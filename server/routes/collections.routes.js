const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { requireUser } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { IMAGE_PROMPT_TYPE } = require('../constants/imagePlatform');

// @route   GET /api/collections
// @desc    Get all collections for the authenticated user
// @access  Private
router.get('/', requireUser, asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('collections')
        .select(`
            id, name, description, created_at,
            collection_prompts ( prompt_id, prompts!inner(prompt_type) )
        `)
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Format the response slightly to make count easier to read
    const formattedData = data.map(col => ({
        ...col,
        prompt_count: (col.collection_prompts || []).filter(item => item.prompts?.prompt_type === IMAGE_PROMPT_TYPE).length
    }));

    res.json({ success: true, data: formattedData });
}));

// @route   POST /api/collections
// @desc    Create a new collection
// @access  Private
router.post('/', requireUser, asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Collection name is required' });

    const { data, error } = await supabaseAdmin
        .from('collections')
        .insert({ user_id: req.user.id, name, description })
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
}));

// @route   DELETE /api/collections/:id
// @desc    Delete a collection
// @access  Private
router.delete('/:id', requireUser, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // RLS will ensure user can only delete their own
    const { error } = await supabaseAdmin
        .from('collections')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Collection deleted' });
}));

// @route   POST /api/collections/:id/prompts
// @desc    Toggle a prompt in/out of a collection
// @access  Private
router.post('/:id/prompts', requireUser, asyncHandler(async (req, res) => {
    const { id: collectionId } = req.params;
    const { prompt_id } = req.body;

    if (!prompt_id) return res.status(400).json({ error: 'prompt_id is required' });

    // Verify ownership
    const { data: col, error: colErr } = await supabaseAdmin
        .from('collections')
        .select('id')
        .eq('id', collectionId)
        .eq('user_id', req.user.id)
        .single();

    if (colErr || !col) return res.status(403).json({ error: 'Not authorized or collection not found' });

    const { data: prompt, error: promptErr } = await supabaseAdmin
        .from('prompts')
        .select('id')
        .eq('id', prompt_id)
        .eq('status', 'published')
        .eq('prompt_type', IMAGE_PROMPT_TYPE)
        .maybeSingle();

    if (promptErr) throw promptErr;
    if (!prompt) return res.status(404).json({ error: 'Image prompt not found' });

    // Check if it's already in the collection
    const { data: existing } = await supabaseAdmin
        .from('collection_prompts')
        .select('id')
        .eq('collection_id', collectionId)
        .eq('prompt_id', prompt_id)
        .maybeSingle();

    if (existing) {
        // Remove it
        await supabaseAdmin.from('collection_prompts').delete().eq('id', existing.id);
        return res.json({ success: true, saved: false });
    } else {
        // Add it
        await supabaseAdmin.from('collection_prompts').insert({ collection_id: collectionId, prompt_id });
        return res.json({ success: true, saved: true });
    }
}));

// @route   GET /api/collections/:id/prompts
// @desc    Get all prompts inside a specific collection
// @access  Private
router.get('/:id/prompts', requireUser, asyncHandler(async (req, res) => {
    const { id: collectionId } = req.params;

    const { data, error } = await supabaseAdmin
        .from('collection_prompts')
        .select(`
            created_at,
            prompts!inner ( id, title, slug, description, difficulty, preview_image_url, is_trending, prompt_type )
        `)
        .eq('collection_id', collectionId)
        .eq('prompts.prompt_type', IMAGE_PROMPT_TYPE)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedPrompts = data.map(cp => ({ ...cp.prompts, saved_at: cp.created_at }));
    res.json({ success: true, data: formattedPrompts });
}));

module.exports = router;
