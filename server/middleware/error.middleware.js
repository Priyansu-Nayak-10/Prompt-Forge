// Centralized Error Handling Middleware
const globalErrorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.name}:`, err.message);

    // Default error structure
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Prevent leaking internal stack traces in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'An unexpected error occurred. Please try again later.';
    }

    // Handle Supabase/Zod specific errors here if needed
    if (err.name === 'ZodError') {
        statusCode = 400;
        message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    }

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        }
    });
};

module.exports = globalErrorHandler;
