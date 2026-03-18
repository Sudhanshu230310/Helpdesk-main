// ============================================================
// Global Error Handler Middleware
// ============================================================

/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err.message);

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the 10MB limit.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Maximum 5 files allowed per upload.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Unexpected file field.' });
    }

    // PostgreSQL errors
    if (err.code === '23505') {
        // Unique constraint violation
        return res.status(409).json({ error: 'Duplicate entry. This record already exists.' });
    }
    if (err.code === '23503') {
        // Foreign key violation
        return res.status(400).json({ error: 'Referenced record does not exist.' });
    }
    if (err.code === 'P0001') {
        // RAISE EXCEPTION from stored procedures
        return res.status(400).json({ error: err.message });
    }

    // JWT errors (handled in auth middleware, but just in case)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: err.message });
    }

    // Default server error
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
};

module.exports = { errorHandler };
