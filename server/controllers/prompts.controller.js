const promptService = require('../services/prompt.service');

const getPrompts = async (req, res) => {
    const { page, limit, q, category, sort, tool } = req.query;
    const result = await promptService.getPublishedPrompts({ page, limit, q, category, sort, tool });
    res.status(200).json({ success: true, data: result.data, metadata: result.metadata });
};

const getPrompt = async (req, res) => {
    const { slug } = req.params;
    const prompt = await promptService.getPromptBySlug(slug);
    if (!prompt) {
        const err = new Error('Prompt not found');
        err.statusCode = 404;
        throw err;
    }
    res.status(200).json({ success: true, data: prompt });
};

// Increment copy count (uses prompt UUID, not slug)
const incrementCopy = async (req, res) => {
    const { id } = req.params;
    await promptService.incrementCopyCount(id);
    res.status(200).json({ success: true, message: 'Copy count updated' });
};

// Increment view count (called from detail page on load)
const incrementView = async (req, res) => {
    const { id } = req.params;
    await promptService.incrementViewCount(id);
    res.status(200).json({ success: true, message: 'View count updated' });
};

const getCategories = async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');
    const { data, error } = await supabaseAdmin.from('categories').select('id, name, slug, icon').order('name');
    if (error) throw error;
    res.json({ success: true, data });
};

const getTools = async (req, res) => {
    const { supabaseAdmin } = require('../config/supabase');
    const { data, error } = await supabaseAdmin.from('tools').select('id, name, slug, logo_url').order('name');
    if (error) throw error;
    res.json({ success: true, data });
};

module.exports = { getPrompts, getPrompt, incrementCopy, incrementView, getCategories, getTools };
