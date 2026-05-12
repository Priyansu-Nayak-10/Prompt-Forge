const { supabaseAdmin } = require('../config/supabase');

const getSavedPromptIds = async (req, res) => {
    const userId = req.user.id;
    // Find all prompt IDs the user has in ANY collection
    const { data, error } = await supabaseAdmin
        .from('collections')
        .select('collection_prompts(prompt_id)')
        .eq('user_id', userId);
        
    if (error) throw error;
    
    // Flatten the array of arrays
    const ids = new Set();
    data.forEach(col => {
        col.collection_prompts.forEach(p => ids.add(p.prompt_id));
    });
    
    res.status(200).json({ success: true, data: Array.from(ids) });
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

const getMe = async (req, res) => {
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

    res.json({
        success: true,
        data: {
            id:    req.user.id,
            email: req.user.email,
            role:  profile?.role || 'user',
        },
    });
};

module.exports = {
    getMe,
    getSavedPromptIds,
    getSubmissions,
    submitPrompt
};
