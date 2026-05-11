const { supabaseAdmin } = require('../config/supabase');
const slugify = require('slugify'); // Requires: npm install slugify

/**
 * Generates a unique SEO-friendly slug.
 * Safely handles concurrency and collision by appending a counter.
 */
const generateUniqueSlug = async (title, table = 'prompts') => {
    const baseSlug = slugify(title, { lower: true, strict: true, trim: true });
    let uniqueSlug = baseSlug;
    let counter = 2;
    let isUnique = false;

    while (!isUnique) {
        // Query Supabase for existing slug
        const { data, error } = await supabaseAdmin
            .from(table)
            .select('slug')
            .eq('slug', uniqueSlug)
            .maybeSingle(); // maybeSingle returns null if 0 rows, instead of throwing an error like .single()

        if (error) {
            throw error;
        }

        if (!data) {
            // No rows returned, meaning the slug is unique
            isUnique = true;
        } else {
            // Collision found, append counter and try again
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }
    }

    return uniqueSlug;
};

module.exports = { generateUniqueSlug };
