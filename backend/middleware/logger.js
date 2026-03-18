// ============================================================
// Request Logger Middleware
// ============================================================

/**
 * Logs incoming HTTP requests with method, URL, and timestamp
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log after response is sent
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLine = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`;

        if (res.statusCode >= 400) {
            console.warn(`⚠️  ${logLine}`);
        } else if (process.env.NODE_ENV === 'development') {
            console.log(`📡 ${logLine}`);
        }
    });

    next();
};

module.exports = { requestLogger };
