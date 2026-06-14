const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { IMAGE_PROMPT_TYPE } = require('../constants/imagePlatform');

router.get('/og/:slug', asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { data: prompt } = await supabaseAdmin
        .from('prompts')
        .select('title, description')
        .eq('slug', slug)
        .eq('status', 'published')
        .eq('prompt_type', IMAGE_PROMPT_TYPE)
        .single();

    if (!prompt) return res.status(404).send('Not found');

    const { createCanvas } = require('canvas');
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, 1200, 630);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 70px sans-serif';
    ctx.fillText(prompt.title, 60, 200);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '30px sans-serif';
    ctx.fillText('PromptForge - AI Image Prompt Platform', 60, 560);

    res.setHeader('Content-Type', 'image/png');
    canvas.createPNGStream().pipe(res);
}));

router.get('/sitemap.xml', asyncHandler(async (req, res) => {
    const { data: prompts } = await supabaseAdmin
        .from('prompts')
        .select('slug, updated_at')
        .eq('status', 'published')
        .eq('prompt_type', IMAGE_PROMPT_TYPE);
    const baseUrl = process.env.PUBLIC_URL || `http://${req.headers.host}`;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/prompts.html</loc><priority>0.9</priority></url>\n`;
    xml += `  <url><loc>${baseUrl}/tools.html</loc><priority>0.7</priority></url>\n`;

    (prompts || []).forEach(p => {
        xml += `  <url><loc>${baseUrl}/prompt-detail.html?slug=${p.slug}</loc><lastmod>${new Date(p.updated_at).toISOString()}</lastmod></url>\n`;
    });

    xml += `</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
}));

module.exports = router;
