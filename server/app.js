require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { globalLimiter } = require('./middleware/rateLimiter.middleware');
const globalErrorHandler = require('./middleware/error.middleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply Global Rate Limiting
app.use('/api', globalLimiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'PromptForge API is running securely.' });
});

// Import and use routes
// Rate limiting will be applied inside specific routes (e.g. auth, submissions, copy)
const promptsRoutes = require('./routes/prompts.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');
const sitemapRoutes = require('./routes/sitemap.routes');
const categoriesRoutes = require('./routes/categories.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const toolsRoutes = require('./routes/tools.routes');

app.use('/api/prompts', promptsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/sitemap.xml', sitemapRoutes);

// Fallback to index.html for frontend routing
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized Error Handling Middleware (must be last)
app.use(globalErrorHandler);

module.exports = app;
