const OpenAI = require('openai');

const optimizePrompt = async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt text is required.' });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ success: false, error: 'AI service not configured on server.' });
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert Prompt Engineer. Your task is to take a raw prompt and optimize it for better results. Improve its clarity, add descriptive sensory details, specify artistic style if applicable, and ensure it follows structural best practices. Keep the original intent but make it significantly more professional and effective. Return ONLY the optimized prompt text without any preamble or quotes."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const optimized = response.choices[0].message.content.trim();
        res.json({ success: true, optimized });
    } catch (err) {
        console.error('OpenAI Error:', err);
        res.status(500).json({ success: false, error: 'Failed to optimize prompt with AI.' });
    }
};

module.exports = {
    optimizePrompt
};
