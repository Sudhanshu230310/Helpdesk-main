// ============================================================
// Authentication Middleware — JWT verify + Role Guard
// ============================================================
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Verify JWT token from Authorization header
 */
const authenticate = async (req, res, next) => {
    try {
        const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from DB to ensure they're still active
        const result = await query('SELECT * FROM sp_get_user_by_id($1)', [decoded.id]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found.' });
        }

        const user = result.rows[0];
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated.' });
        }

        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        next(error);
    }
};

/**
 * Authorize based on user roles
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'technician')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access denied. Required role: ${roles.join(' or ')}`,
            });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
