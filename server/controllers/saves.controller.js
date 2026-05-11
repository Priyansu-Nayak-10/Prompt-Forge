const savesService = require('../services/saves.service');

const toggleSave = async (req, res) => {
    const userId = req.user.id;
    const { promptId } = req.body;
    
    if (!promptId) {
        return res.status(400).json({ success: false, error: 'promptId is required' });
    }

    const result = await savesService.toggleSave(userId, promptId);
    res.status(200).json({ success: true, ...result });
};

const getSavedPrompts = async (req, res) => {
    const userId = req.user.id;
    const savedPrompts = await savesService.getSavedPrompts(userId);
    res.status(200).json({ success: true, data: savedPrompts });
};

const getSavedPromptIds = async (req, res) => {
    const userId = req.user.id;
    const ids = await savesService.getSavedPromptIds(userId);
    res.status(200).json({ success: true, data: ids });
};

module.exports = { toggleSave, getSavedPrompts, getSavedPromptIds };
