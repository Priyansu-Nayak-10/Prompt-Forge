const { supabaseAdmin } = require('../config/supabase');
const slugify = require('slugify');
const { IMAGE_PROMPT_TYPE, IMAGE_TOOL_NAMES } = require('../constants/imagePlatform');

const getSavedPromptIds = async (req, res) => {
    const userId = req.user.id;
    // Find all prompt IDs the user has in ANY collection
    const { data, error } = await supabaseAdmin
        .from('collections')
        .select('collection_prompts(prompt_id, prompts!inner(prompt_type))')
        .eq('user_id', userId);
        
    if (error) throw error;
    
    // Flatten the array of arrays
    const ids = new Set();
    data.forEach(col => {
        col.collection_prompts.forEach(p => {
            if (p.prompts?.prompt_type === 'text-to-image') ids.add(p.prompt_id);
        });
    });
    
    res.status(200).json({ success: true, data: Array.from(ids) });
};

const getLikedPromptIds = async (req, res) => {
    const userId = req.user.id;
    const { data, error } = await supabaseAdmin
        .from('likes')
        .select('prompt_id')
        .eq('user_id', userId);

    if (error) throw error;
    res.status(200).json({ success: true, data: data.map(l => l.prompt_id) });
};

const likePrompt = async (req, res) => {
    const userId = req.user.id;
    const { promptId } = req.params;

    const { data: existing, error: checkError } = await supabaseAdmin
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('prompt_id', promptId)
        .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
        return res.status(200).json({ success: true, message: 'Already liked' });
    }

    const { data, error } = await supabaseAdmin
        .from('likes')
        .insert([{ user_id: userId, prompt_id: promptId }])
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
};

const unlikePrompt = async (req, res) => {
    const userId = req.user.id;
    const { promptId } = req.params;

    const { error } = await supabaseAdmin
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('prompt_id', promptId);

    if (error) throw error;
    res.status(200).json({ success: true, message: 'Like removed' });
};

const getSubmissions = async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, count, error } = await supabaseAdmin
        .from('submissions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(start, end);

    if (error) throw error;
    res.status(200).json({ 
        success: true, 
        data,
        metadata: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        }
    });
};

const IMAGE_SIGNATURES = [
    { bytes: [0xFF, 0xD8, 0xFF] },
    { bytes: [0x89, 0x50, 0x4E, 0x47] },
    { bytes: [0x47, 0x49, 0x46, 0x38] },
    { bytes: [0x52, 0x49, 0x46, 0x46] },
];

const isImageBuffer = (buffer) => IMAGE_SIGNATURES.some(sig => sig.bytes.every((byte, i) => buffer[i] === byte));

const uploadSubmissionImage = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No image uploaded.' });
    if (!req.file.mimetype.startsWith('image/') || !isImageBuffer(req.file.buffer)) {
        return res.status(400).json({ success: false, error: 'Upload a valid image file.' });
    }

    const fileExt = req.file.originalname.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseName = req.file.originalname.replace(`.${fileExt}`, '');
    const cleanSlug = slugify(baseName, { lower: true, strict: true }) || 'sample-output';
    const fileName = `submissions/${req.user.id}/${cleanSlug}-${Date.now()}.${fileExt}`;

    const { error } = await supabaseAdmin.storage
        .from('prompt-images')
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
        .from('prompt-images')
        .getPublicUrl(fileName);

    res.status(200).json({ success: true, url: publicUrl });
};

const submitPrompt = async (req, res) => {
    const userId = req.user.id;
    const { title, prompt_text, description, difficulty, tags, category_id, supported_tools, preview_image_url } = req.body;

    if (!title || !prompt_text) {
        return res.status(400).json({ success: false, error: 'Title and prompt text are required.' });
    }

    if (!preview_image_url) {
        return res.status(400).json({ success: false, error: 'Sample output image is required.' });
    }

    const tools = Array.isArray(supported_tools)
        ? supported_tools.filter(tool => IMAGE_TOOL_NAMES.includes(tool))
        : [];

    const { data, error } = await supabaseAdmin
        .from('submissions')
        .insert([{
            title,
            prompt_text,
            description,
            difficulty: difficulty || 'intermediate',
            prompt_type: IMAGE_PROMPT_TYPE,
            tags: Array.isArray(tags) ? tags : [],
            category_id,
            supported_tools: tools,
            preview_image_url,
            status: 'pending',
            user_id: userId
        }])
        .select()
        .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
};

const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const { display_name, avatar_url, theme } = req.body;

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ display_name, avatar_url, theme })
        .eq('id', userId)
        .select()
        .single();

    if (error) throw error;
    res.json({ success: true, data });
};

const uploadAvatar = async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: true
        });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(fileName);

    res.json({ success: true, url: publicUrl });
};

const getMe = async (req, res) => {
    let { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role, display_name, avatar_url, theme')
        .eq('id', req.user.id)
        .single();

    // If profile doesn't exist, create it on the fly
    if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabaseAdmin
            .from('profiles')
            .insert([{ 
                id: req.user.id, 
                role: 'user',
                display_name: req.user.email.split('@')[0]
            }])
            .select()
            .single();
        
        if (!createError) profile = newProfile;
    }

    res.json({
        success: true,
        data: {
            id:    req.user.id,
            email: req.user.email,
            role:  profile?.role || 'user',
            display_name: profile?.display_name || '',
            avatar_url: profile?.avatar_url || '',
            theme: profile?.theme || 'dark'
        },
    });
};

module.exports = {
    getMe,
    getSavedPromptIds,
    getLikedPromptIds,
    likePrompt,
    unlikePrompt,
    getSubmissions,
    submitPrompt,
    updateProfile,
    uploadAvatar,
    uploadSubmissionImage
};
