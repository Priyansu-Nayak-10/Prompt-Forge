const { supabaseAdmin } = require('../config/supabase');

const getPromptReviews = async (req, res) => {
    const { promptId } = req.params;
    
    const { data, error } = await supabaseAdmin
        .from('reviews')
        .select('*, profiles(display_name, avatar_url)')
        .eq('prompt_id', promptId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
};

const createReview = async (req, res) => {
    const { promptId } = req.params;
    const userId = req.user.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    const { data, error } = await supabaseAdmin
        .from('reviews')
        .upsert([{ 
            prompt_id: promptId, 
            user_id: userId, 
            rating, 
            comment 
        }], { onConflict: 'prompt_id, user_id' })
        .select()
        .single();

    if (error) throw error;
    res.json({ success: true, data });
};

const deleteReview = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    // First check ownership
    const { data: review } = await supabaseAdmin
        .from('reviews')
        .select('user_id')
        .eq('id', id)
        .single();

    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    
    if (review.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { error } = await supabaseAdmin
        .from('reviews')
        .delete()
        .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Review deleted' });
};

module.exports = {
    getPromptReviews,
    createReview,
    deleteReview
};
