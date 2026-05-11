require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const path        = require('path');
const pinoHttp    = require('pino-http');

const logger               = require('./utils/logger');
const { globalLimiter }    = require('./middleware/rateLimiter.middleware');
const globalErrorHandler   = require('./middleware/error.middleware');

const app = express();

// ─── Trust Render's Reverse Proxy ────────────────────────────────────────────
app.set('trust proxy', 1);

// ─── Request Logging (pino-http) ─────────────────────────────────────────────
app.use(pinoHttp({
    logger,
    autoLogging: {
        // Don't log health checks to reduce noise
        ignore: (req) => req.url === '/api/health',
    },
    customLogLevel: (req, res) => res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
}));

// ─── Security Headers (helmet) ───────────────────────────────────────────────
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
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

// ─── Gzip Compression ────────────────────────────────────────────────────────
app.use(compression());

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.PUBLIC_URL ? [process.env.PUBLIC_URL] : true;
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
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    },
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'PromptForge API is running.', env: process.env.NODE_ENV || 'development' });
});

// ─── Runtime Config for Frontend ──────────────────────────────────────────────
// Exposes ONLY the public anon key — never the service role key.
// Frontend fetches this once at startup to avoid hardcoding credentials in source.
app.get('/api/config', (req, res) => {
    const url     = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        return res.status(503).json({ success: false, error: 'Server configuration incomplete.' });
    }

    // 5-min browser cache — safe since keys rarely change
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ url, anonKey });
});

// ─── Public Stats for Hero Section ────────────────────────────────────────────
const { supabaseAdmin } = require('./config/supabase');
const asyncHandler = require('./utils/asyncHandler');

app.get('/api/stats', asyncHandler(async (req, res) => {
    const [promptsRes, usersRes, catsRes] = await Promise.all([
        supabaseAdmin.from('prompts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('categories').select('id', { count: 'exact', head: true }),
    ]);
    res.setHeader('Cache-Control', 'public, max-age=120'); // 2-min cache
    res.json({
        success: true,
        data: {
            prompts:    promptsRes.count || 0,
            users:      usersRes.count   || 0,
            categories: catsRes.count    || 0,
        },
    });
}));

// ─── API Routes ───────────────────────────────────────────────────────────────
const promptsRoutes  = require('./routes/prompts.routes');
const adminRoutes    = require('./routes/admin.routes');
const uploadRoutes   = require('./routes/upload.routes');
const sitemapRoutes  = require('./routes/sitemap.routes');
const userRoutes     = require('./routes/user.routes');

app.use('/api/prompts',  promptsRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/upload',   uploadRoutes);
app.use('/api/user',     userRoutes);
app.use('/sitemap.xml',  sitemapRoutes);

// ─── SPA Fallback ─────────────────────────────────────────────────────────────
app.get('/*path', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        const err = new Error(`API route not found: ${req.method} ${req.path}`);
        err.statusCode = 404;
        return next(err);
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ─── Centralised Error Handler ────────────────────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;
