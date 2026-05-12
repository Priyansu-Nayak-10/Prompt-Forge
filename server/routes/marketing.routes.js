const express = require('express');
const router  = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');

// Newsletter
router.post(
    '/newsletter/subscribe',
    [body('email').isEmail().normalizeEmail()],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

        const { email } = req.body;
        const { error } = await supabaseAdmin.from('subscribers').insert({ email });
        if (error && (error.code === '23505' || error.message.includes('duplicate'))) {
            return res.status(400).json({ success: false, error: 'Already subscribed!' });
        }
        if (error) throw error;

        if (process.env.RESEND_API_KEY) {
            const { Resend } = require('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            resend.emails.send({
                from: 'PromptForge <onboarding@resend.dev>',
                to: email,
                subject: 'Welcome to PromptForge! ✨',
                html: '<h1>Welcome!</h1><p>Thanks for joining PromptForge.</p>'
            }).catch(() => {});
        }
        res.status(201).json({ success: true, message: 'Subscribed!' });
    })
);

// OpenGraph Images
router.get('/og/:slug', asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const { data: prompt } = await supabaseAdmin.from('prompts').select('title, description').eq('slug', slug).single();
    if (!prompt) return res.status(404).send('Not found');

    const { createCanvas } = require('canvas');
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    
    // Simple dark background
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, 1200, 630);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 70px sans-serif';
    ctx.fillText(prompt.title, 60, 200);
    
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '30px sans-serif';
    ctx.fillText('PromptForge — AI Prompt Discovery', 60, 560);
    
    res.setHeader('Content-Type', 'image/png');
    canvas.createPNGStream().pipe(res);
}));

// Sitemap
router.get('/sitemap.xml', asyncHandler(async (req, res) => {
    const { data: prompts } = await supabaseAdmin.from('prompts').select('slug, updated_at').eq('status', 'published');
    const baseUrl = process.env.PUBLIC_URL || `http://${req.headers.host}`;
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url><loc>${baseUrl}/</loc><priority>1.0</priority></url>\n`;
    
    (prompts || []).forEach(p => {
        xml += `  <url><loc>${baseUrl}/prompt-detail.html?slug=${p.slug}</loc><lastmod>${new Date(p.updated_at).toISOString()}</lastmod></url>\n`;
    });
    
    xml += `</urlset>`;
    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
}));

module.exports = router;
