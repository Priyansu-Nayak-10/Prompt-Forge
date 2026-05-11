
const generateCanonicalUrl = (path) => {
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    return `${baseUrl}${path}`;
};


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
