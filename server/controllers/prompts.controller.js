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

// Now uses :id (UUID) instead of slug — avoids route conflict with /:slug
const incrementCopy = async (req, res) => {
    const { id } = req.params;
    await promptService.incrementCopyCount(id);
    res.status(200).json({ success: true, message: 'Copy count updated' });
};

module.exports = { getPrompts, getPrompt, incrementCopy };
