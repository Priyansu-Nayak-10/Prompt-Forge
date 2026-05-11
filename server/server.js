const app  = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Required by Render — must bind to all interfaces

const server = app.listen(PORT, HOST, () => {
    const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    console.log(`✓ PromptForge running on port ${PORT}`);
    console.log(`✓ Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Public URL  : ${publicUrl}`);
});

// Graceful shutdown — Render sends SIGTERM before stopping a service
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server gracefully...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    server.close(() => process.exit(0));
});
