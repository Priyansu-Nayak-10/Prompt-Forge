const promptService = require('../services/prompt.service');

const createPrompt = async (req, res) => {
    const prompt = await promptService.createPrompt(req.body);
    res.status(201).json({ success: true, data: prompt });
};

const updatePrompt = async (req, res) => {
    const prompt = await promptService.updatePrompt(req.params.id, req.body);
    res.status(200).json({ success: true, data: prompt });
};

const deletePrompt = async (req, res) => {
    await promptService.softDeletePrompt(req.params.id);
    res.status(200).json({ success: true, message: 'Prompt archived successfully' });
};

module.exports = { createPrompt, updatePrompt, deletePrompt };
