const { supabaseAdmin } = require('../config/supabase');
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ─── Reviews ─────────────────────────────────────────────────────────────────
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
        .upsert([{ prompt_id: promptId, user_id: userId, rating, comment }], { onConflict: 'prompt_id, user_id' })
        .select()
        .single();

    if (error) throw error;
    res.json({ success: true, data });
};

const deleteReview = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: review } = await supabaseAdmin.from('reviews').select('user_id').eq('id', id).single();
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    if (review.user_id !== userId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    const { error } = await supabaseAdmin.from('reviews').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Review deleted' });
};

// ─── AI Optimization ─────────────────────────────────────────────────────────
const optimizePrompt = async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt text is required.' });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ success: false, error: 'AI service not configured.' });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are an expert Prompt Engineer. Optimize the user's prompt for clarity, detail, and effectiveness. Return ONLY the optimized text." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        });
        res.json({ success: true, optimized: response.choices[0].message.content.trim() });
    } catch (err) {
        res.status(500).json({ success: false, error: 'AI optimization failed.' });
    }
};

// ─── Stripe Checkout ─────────────────────────────────────────────────────────
const createCheckoutSession = async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ success: false, error: 'Payments not configured.' });

    const { promptId, promptTitle, slug } = req.body;
    const publicUrl = process.env.PUBLIC_URL || `http://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: { name: `Support Creator: ${promptTitle || 'Prompt'}`, description: `Tip for prompt ID: ${promptId}` },
                unit_amount: 500,
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${publicUrl}/prompt-detail.html?slug=${slug}&success=true`,
        cancel_url:  `${publicUrl}/prompt-detail.html?slug=${slug}&canceled=true`,
        metadata: { prompt_id: promptId, user_id: req.user.id }
    });

    res.json({ success: true, url: session.url });
};

module.exports = {
    getPromptReviews,
    createReview,
    deleteReview,
    optimizePrompt,
    createCheckoutSession
};
