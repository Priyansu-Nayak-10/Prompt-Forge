const { supabaseAdmin } = require('../config/supabase');

const toggleSave = async (userId, promptId) => {
    // Check if already saved
    const { data: existing, error: checkError } = await supabaseAdmin
        .from('saves')
        .select('id')
        .eq('user_id', userId)
        .eq('prompt_id', promptId)
        .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
        // Unsave
        const { error: deleteError } = await supabaseAdmin
            .from('saves')
            .delete()
            .eq('id', existing.id);
        if (deleteError) throw deleteError;
        return { saved: false };
    } else {
        // Save
        const { error: insertError } = await supabaseAdmin
            .from('saves')
            .insert({ user_id: userId, prompt_id: promptId });
        if (insertError) throw insertError;
        return { saved: true };
    }
};

const getSavedPrompts = async (userId) => {
    const { data, error } = await supabaseAdmin
        .from('saves')
        .select(`
            id,
            prompt_id,
            created_at,
            prompts (
                id,
                title,
                slug,
                description,
                difficulty,
                preview_image_url
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Map data to a flat structure that frontend expects
    return data.map(save => ({
        save_id: save.id,
        saved_at: save.created_at,
        ...save.prompts
    }));
};

const getSavedPromptIds = async (userId) => {
    const { data, error } = await supabaseAdmin
        .from('saves')
        .select('prompt_id')
        .eq('user_id', userId);
        
    if (error) throw error;
    return data.map(save => save.prompt_id);
}

module.exports = { toggleSave, getSavedPrompts, getSavedPromptIds };
