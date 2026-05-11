require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
const path       = require('path');

const { globalLimiter }    = require('./middleware/rateLimiter.middleware');
const globalErrorHandler   = require('./middleware/error.middleware');

const app = express();

// ─── Trust Render's Reverse Proxy ────────────────────────────────────────────
// Render sits behind a load balancer. Setting trust proxy = 1 lets Express
// read the real client IP from X-Forwarded-For so rate limiting works correctly.
app.set('trust proxy', 1);

// ─── Security Headers (helmet) ───────────────────────────────────────────────
// Adds X-Content-Type-Options, X-Frame-Options, HSTS, CSP etc.
// contentSecurityPolicy is configured to allow Supabase CDN + jsdelivr for the
// frontend ESM import of @supabase/supabase-js.
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc:     ["'self'"],
                scriptSrc:      ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
                styleSrc:       ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdn.jsdelivr.net'],
                fontSrc:        ["'self'", 'fonts.gstatic.com'],
                imgSrc:         ["'self'", 'data:', 'blob:', '*.supabase.co', '*.supabase.in'],
                connectSrc:     ["'self'", '*.supabase.co', '*.supabase.in'],
                frameSrc:       ["'none'"],
                objectSrc:      ["'none'"],
                upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
            },
        },
        // Allow cross-origin resource policy for Supabase storage images
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// ─── Gzip Compression ────────────────────────────────────────────────────────
app.use(compression());

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production: only accept requests from our own Render domain.
// In dev: allow all origins for local testing convenience.
const allowedOrigins = process.env.PUBLIC_URL
    ? [process.env.PUBLIC_URL]
    : true; // allow all in dev

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Global Rate Limiting (API only) ─────────────────────────────────────────
app.use('/api', globalLimiter);

// ─── Static Frontend Serving ──────────────────────────────────────────────────
// Serve all files from /public with production-safe cache headers.
// HTML files get a short cache (always revalidate), assets get long cache.
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d',           // default cache for assets (CSS/JS/images)
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // HTML pages must revalidate on every request so deploys take effect immediately
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    },
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status:  'ok',
        message: 'PromptForge API is running.',
        env:     process.env.NODE_ENV || 'development',
    });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const promptsRoutes     = require('./routes/prompts.routes');
const adminRoutes       = require('./routes/admin.routes');
const uploadRoutes      = require('./routes/upload.routes');
const sitemapRoutes     = require('./routes/sitemap.routes');
const categoriesRoutes  = require('./routes/categories.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const toolsRoutes       = require('./routes/tools.routes');

app.use('/api/prompts',     promptsRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/upload',      uploadRoutes);
app.use('/api/categories',  categoriesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/tools',       toolsRoutes);
app.use('/sitemap.xml',     sitemapRoutes);

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
// ONLY intercepts non-API, non-asset requests and sends index.html.
// This lets the frontend handle its own "page not found" state.
// API routes that reach here (404s) fall through to the error handler below.
app.get('/*path', (req, res, next) => {
    // Let genuine API 404s pass to the error handler
    if (req.path.startsWith('/api/')) {
        const err = new Error(`API route not found: ${req.method} ${req.path}`);
        err.statusCode = 404;
        return next(err);
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Centralised Error Handler (must be last) ─────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;
