const promptService = require('../services/prompt.service');
const { supabaseAdmin } = require('../config/supabase');

const toggleSave = async (req, res) => {
    const userId = req.user.id;
    const { promptId } = req.body;
    if (!promptId) return res.status(400).json({ success: false, error: 'promptId is required' });

    const result = await promptService.toggleSave(userId, promptId);
    res.status(200).json({ success: true, ...result });
};

const getSavedPrompts = async (req, res) => {
    const userId = req.user.id;
    const data = await promptService.getSavedPrompts(userId);
    res.status(200).json({ success: true, data });
};

const getSavedPromptIds = async (req, res) => {
    const userId = req.user.id;
    const data = await promptService.getSavedPromptIds(userId);
    res.status(200).json({ success: true, data });
};

const getSubmissions = async (req, res) => {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ success: true, data });
};

const submitPrompt = async (req, res) => {
    const userId = req.user.id;
    const { title, prompt_text, description, difficulty, prompt_type, tags, category_id, supported_tools } = req.body;

    if (!title || !prompt_text) {
        return res.status(400).json({ success: false, error: 'Title and prompt text are required.' });
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
            user_id: userId
        }])
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
};

module.exports = {
    toggleSave,
    getSavedPrompts,
    getSavedPromptIds,
    getSubmissions,
    submitPrompt
};
