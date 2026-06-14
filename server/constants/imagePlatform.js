const IMAGE_PROMPT_TYPE = 'text-to-image';

const IMAGE_CATEGORY_SLUGS = [
    'portrait',
    'character-design',
    'anime',
    'fantasy',
    'product-photography',
    'architecture',
    'concept-art',
    'fashion',
    'landscape',
    'logo-design',
    'image-editing',
    'image-transformation',
    'photorealistic',
    'illustration',
];

const IMAGE_TOOL_NAMES = [
    'Midjourney',
    'FLUX',
    'Stable Diffusion',
    'Ideogram',
    'DALL-E',
    'DALL·E',
    'DALL·E 3',
    'Leonardo AI',
    'Firefly',
    'Adobe Firefly',
];

const IMAGE_TOOL_SLUGS = [
    'midjourney',
    'flux',
    'stable-diffusion',
    'ideogram',
    'dall-e',
    'dalle',
    'dall-e-3',
    'leonardo-ai',
    'firefly',
    'adobe-firefly',
];

module.exports = {
    IMAGE_PROMPT_TYPE,
    IMAGE_CATEGORY_SLUGS,
    IMAGE_TOOL_NAMES,
    IMAGE_TOOL_SLUGS,
};
