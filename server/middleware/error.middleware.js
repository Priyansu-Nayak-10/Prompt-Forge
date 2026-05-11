const logger = require('../utils/logger');

const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || (err.name === 'ZodError' ? 400 : 500);

    let message = err.message || 'Internal Server Error';

    if (err.name === 'ZodError') {
        message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    }

    logger.error({
        err: { name: err.name, message: err.message, stack: err.stack },
        req: { method: req.method, url: req.url, ip: req.ip },
        statusCode,
    }, `[${statusCode}] ${req.method} ${req.url} — ${message}`);

    // Never leak stack traces in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'An unexpected error occurred. Please try again later.';
    }

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV !== 'production' && statusCode !== 400 && { stack: err.stack }),
        },
    });
};

module.exports = globalErrorHandler;
