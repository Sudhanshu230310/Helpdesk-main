// ============================================================
// User Controller — Profile management
// ============================================================
const { query } = require('../config/db');

/**
 * Get current user profile
 * GET /api/users/profile
 */
const getProfile = async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM sp_get_user_by_id($1)', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

/**
 * Update current user profile
 * PUT /api/users/profile
 */
const updateProfile = async (req, res, next) => {
    try {
        const { name, phone, department } = req.body;

        const success = await query(
            'SELECT sp_update_user_profile($1, $2, $3, $4)',
            [req.user.id, name || null, phone || null, department || null]
        );

        // Get updated profile
        const result = await query('SELECT * FROM sp_get_user_by_id($1)', [req.user.id]);

        res.json({
            message: 'Profile updated successfully.',
            user: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, updateProfile };
