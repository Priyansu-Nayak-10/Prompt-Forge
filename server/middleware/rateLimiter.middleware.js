const rateLimit = require('express-rate-limit');

// ─── NOTE ON PROXY TRUST ─────────────────────────────────────────────────────
// In express-rate-limit v7+, trustProxy is NOT a per-limiter option.
// Proxy trust is configured once on the Express app itself:
//   app.set('trust proxy', 1)  ← already set in app.js
// This tells Express (and therefore the rate limiter) to read the real client
// IP from Render's X-Forwarded-For header instead of the load-balancer IP.
// ─────────────────────────────────────────────────────────────────────────────

// Shared defaults applied to every limiter
const sharedOptions = {
    standardHeaders: true,  // Return RateLimit-* response headers (RFC 6585)
    legacyHeaders:   false, // Disable deprecated X-RateLimit-* headers
};

// Global API Limiter — prevents general spam and basic scraping
const globalLimiter = rateLimit({
    ...sharedOptions,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max:      100,
    message:  { success: false, error: 'Too many requests, please try again later.' },
});

// Auth Limiter — strict limit to prevent brute-force login attempts
const authLimiter = rateLimit({
    ...sharedOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max:      5,
    message:  { success: false, error: 'Too many login attempts, please try again after an hour.' },
});

// Analytics Limiter — prevents artificially inflating view/copy counts
const analyticsLimiter = rateLimit({
    ...sharedOptions,
    windowMs: 60 * 1000, // 1 minute
    max:      10,
    message:  { success: false, error: 'Analytics rate limit exceeded.' },
});

// Upload Limiter — prevents storage exhaustion attacks
const uploadLimiter = rateLimit({
    ...sharedOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max:      20,
    message:  { success: false, error: 'Upload limit reached.' },
});

module.exports = { globalLimiter, authLimiter, analyticsLimiter, uploadLimiter };
