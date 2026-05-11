/**
 * Generates canonical URLs to prevent duplicate indexing.
 * @param {string} path - The path of the page (e.g., /prompts/cinematic-portrait)
 */
const generateCanonicalUrl = (path) => {
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    return `${baseUrl}${path}`;
};

/**
 * Generates standard OpenGraph and Twitter meta tags payload for the frontend to consume.
 */
const generateMetaTags = (title, description, imageUrl, url) => {
    return {
        title,
        description,
        canonical: url,
        openGraph: {
            title,
            description,
            url,
            images: [
                { url: imageUrl, alt: title }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            image: imageUrl
        }
    };
};

module.exports = { generateCanonicalUrl, generateMetaTags };
