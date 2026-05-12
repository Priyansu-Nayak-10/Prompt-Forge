const express = require('express');
const router = express.Router();
const { createCanvas, registerFont } = require('canvas');
const { supabaseAdmin } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');

// Helper to wrap text into multiple lines
const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
};

// @route   GET /api/og/:slug
// @desc    Generate dynamic OpenGraph image for a prompt
// @access  Public
router.get('/:slug', asyncHandler(async (req, res) => {
    const { slug } = req.params;

    // 1. Fetch prompt data
    const { data: prompt, error } = await supabaseAdmin
        .from('prompts')
        .select('title, category:categories(name), difficulty')
        .eq('slug', slug)
        .single();

    if (error || !prompt) {
        return res.status(404).json({ error: 'Prompt not found' });
    }

    // 2. Setup Canvas (Standard OG Image size: 1200x630)
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 3. Draw Background
    // Create a beautiful gradient background (similar to PromptForge theme)
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0a0a'); // Dark background
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw an accent glow blob in the top right
    const glow = ctx.createRadialGradient(width - 200, 100, 0, width - 200, 100, 600);
    glow.addColorStop(0, 'rgba(124, 77, 255, 0.2)'); // var(--accent-glow)
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // 4. Draw Header/Brand
    ctx.fillStyle = '#a78bfa'; // var(--accent-2)
    ctx.font = 'bold 32px sans-serif'; // Using default sans-serif since custom font loading in Node can be tricky without local TTF files
    ctx.fillText('✨ PromptForge', 80, 100);

    // 5. Draw Badges (Category & Difficulty)
    const categoryName = prompt.category?.name || 'Uncategorized';
    const difficulty = (prompt.difficulty || 'Intermediate').toUpperCase();

    ctx.font = 'bold 24px sans-serif';
    
    // Category Badge
    ctx.fillStyle = 'rgba(124, 77, 255, 0.15)'; // var(--accent-subtle)
    ctx.beginPath();
    ctx.roundRect(80, 150, ctx.measureText(categoryName).width + 40, 48, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(124, 77, 255, 0.45)';
    ctx.stroke();
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(categoryName, 100, 183);

    // Difficulty Badge
    const diffX = 80 + ctx.measureText(categoryName).width + 60;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(diffX, 150, ctx.measureText(difficulty).width + 40, 48, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText(difficulty, diffX + 20, 183);

    // 6. Draw Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    wrapText(ctx, prompt.title, 80, 300, 1000, 85);

    // 7. Draw Footer text
    ctx.fillStyle = '#888888';
    ctx.font = '32px sans-serif';
    ctx.fillText('Find your creative style at promptforge.com', 80, 550);

    // 8. Return Image
    const buffer = canvas.toBuffer('image/png');
    
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(buffer);
}));

module.exports = router;
