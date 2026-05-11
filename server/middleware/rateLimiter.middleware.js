const rateLimit = require('express-rate-limit');

// Global API Limiter: Prevents general spam and basic scraping
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    message: { success: false, error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth Limiter: Stricter limits to prevent brute force
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 login requests per hour
    message: { success: false, error: 'Too many login attempts, please try again after an hour.' }
});

// Analytics Limiter: Prevent artificially inflating views/copies
const analyticsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { success: false, error: 'Analytics rate limit exceeded.' }
});

// Upload Limiter: Prevent storage exhaustion
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: { success: false, error: 'Upload limit reached.' }
});

module.exports = { globalLimiter, authLimiter, analyticsLimiter, uploadLimiter };
