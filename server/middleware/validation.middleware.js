const { z } = require('zod');
const { IMAGE_PROMPT_TYPE } = require('../constants/imagePlatform');

// Middleware to execute a Zod schema against the request body or query
const validate = (schema, target = 'body') => {
    return (req, res, next) => {
        try {
            const parsed = schema.parse(req[target]);
            req[target] = parsed; // Replace with validated/coerced data
            next();
        } catch (error) {
            next(error); // Passes the ZodError to the globalErrorHandler
        }
    };
};

// --- Reusable Zod Schemas ---

const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q: z.string().optional(),
    category: z.string().uuid().optional(),
    tool: z.string().optional(),
    sort: z.enum(['latest', 'trending']).default('latest')
});

const slugParamSchema = z.object({
    slug: z.string().min(3).max(100)
});

const promptCreateSchema = z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    prompt_text: z.string().min(5),
    negative_prompt: z.string().optional(),
    category_id: z.string().uuid().optional().nullable(),
    preview_image_url: z.string().url().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    prompt_type: z.literal(IMAGE_PROMPT_TYPE).default(IMAGE_PROMPT_TYPE),
    status: z.enum(['draft', 'pending', 'published', 'rejected', 'archived']).default('published')
});

const promptUpdateSchema = promptCreateSchema.partial();

module.exports = { validate, paginationSchema, slugParamSchema, promptCreateSchema, promptUpdateSchema };
