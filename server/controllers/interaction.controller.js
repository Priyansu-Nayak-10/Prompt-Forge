const { supabaseAdmin } = require('../config/supabase');
const OpenAI = require('openai');
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? require('stripe')(stripeKey) : null;


// Reviews
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

// AI Optimization
const optimizePrompt = async (req, res) => {
    const { prompt, style, type } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: 'Prompt text is required.' });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({ success: false, error: 'AI service not configured.' });

    let systemInstruction = "You are an expert Prompt Engineer. Optimize the user's prompt for clarity, detail, and effectiveness.";

    if (type === 'text-to-image') {
        systemInstruction += " Since this is a Text-to-Image prompt, focus on visual styling, artistic medium, lighting, camera settings (if applicable), and clear descriptive subject matter. Exclude direct text reasoning instructions.";
    } else if (type === 'text-to-video') {
        systemInstruction += " Since this is a Text-to-Video prompt, focus on motion descriptions, transitions, camera movement, temporal elements, and cinematic visual styling.";
    } else if (type === 'text-to-text') {
        systemInstruction += " Since this is a Text-to-Text prompt, focus on structural clarity, explicit constraints, step-by-step reasoning instructions, and persona definition to ensure the AI responds with high fidelity.";
    }

    if (style === 'creative') {
        systemInstruction += " Make the prompt highly imaginative, evocative, and rich in metaphors or expressive language.";
    } else if (style === 'photorealistic') {
        systemInstruction += " Make the prompt focused on photorealism: hyper-detailed camera lenses (e.g., 85mm, f/1.4), cinematic lighting (e.g., volumetric, golden hour), and lifelike texture descriptions.";
    } else if (style === 'concise') {
        systemInstruction += " Keep the prompt short, punchy, and highly optimized, keeping only the most essential instructions or keywords.";
    } else if (style === 'academic') {
        systemInstruction += " Make the prompt highly structured, formal, and precise, resembling scientific or scholarly queries.";
    }

    systemInstruction += " Return ONLY the final optimized prompt text, without any introductory or explanatory text.";

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemInstruction },
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

// Stripe Checkout
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
