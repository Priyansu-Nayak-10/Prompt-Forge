const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { generateCanonicalUrl } = require('../utils/seo');
const asyncHandler = require('../utils/asyncHandler');

const generateSitemap = async (req, res) => {
    // Fetch all published prompts
    const { data: prompts, error } = await supabaseAdmin
        .from('prompts')
        .select('slug, updated_at')
        .eq('status', 'published');

    if (error) throw error;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Base URL
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    
    // Static Routes
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/prompts.html</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

    // Dynamic Prompts
    prompts.forEach(prompt => {
        const url = generateCanonicalUrl(`/prompt-detail.html?slug=${prompt.slug}`);
        const lastmod = new Date(prompt.updated_at).toISOString();
        xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    xml += '</urlset>';

    res.header('Content-Type', 'application/xml');
    res.send(xml);
};

router.get('/', asyncHandler(generateSitemap));

module.exports = router;
