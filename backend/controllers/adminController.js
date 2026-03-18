// ============================================================
// Admin Controller — Reports, user/team/category management
// ============================================================
const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const csv = require('csv-parser');

/**
 * Get dashboard statistics
 * GET /api/admin/dashboard
 */
const getDashboardStats = async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM sp_get_dashboard_stats($1, $2)',
            [req.user.id, req.user.role]
        );

        res.json({ stats: result.rows[0] || {} });
    } catch (error) {
        next(error);
    }
};

/**
 * Get report by category
 * GET /api/admin/reports/by-category
 */
const reportByCategory = async (req, res, next) => {
    try {
        const { start_date, end_date, user_id } = req.query;
        const result = await query(
            'SELECT * FROM sp_report_by_category($1, $2, $3)',
            [start_date || null, end_date || null, user_id || null]
        );
        res.json({ report: result.rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Get report by team
 * GET /api/admin/reports/by-team
 */
const reportByTeam = async (req, res, next) => {
    try {
        const { start_date, end_date, user_id } = req.query;
        const result = await query(
            'SELECT * FROM sp_report_by_team($1, $2, $3)',
            [start_date || null, end_date || null, user_id || null]
        );
        res.json({ report: result.rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Get report by technician
 * GET /api/admin/reports/by-technician
 */
const reportByTechnician = async (req, res, next) => {
    try {
        const { start_date, end_date, user_id } = req.query;
        const result = await query(
            'SELECT * FROM sp_report_by_technician($1, $2, $3)',
            [start_date || null, end_date || null, user_id || null]
        );
        res.json({ report: result.rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Get ticket turnaround time
 * GET /api/admin/reports/turnaround/:ticketId
 */
const getTicketTurnaround = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const result = await query('SELECT * FROM sp_get_ticket_turnaround($1)', [ticketId]);
        res.json({ turnaround: result.rows[0] || null });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all users (admin list)
 * GET /api/admin/users
 */
const getAllUsers = async (req, res, next) => {
    try {
        const { role, page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await query(
            'SELECT * FROM sp_get_all_users($1, $2, $3)',
            [role || null, parseInt(limit), offset]
        );

        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
            users: result.rows.map(r => ({ ...r, total_count: undefined })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount,
                pages: Math.ceil(totalCount / parseInt(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all teams
 * GET /api/admin/teams
 */
const getTeams = async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM sp_get_all_teams()');
        res.json({ teams: result.rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new team
 * POST /api/admin/teams
 */
const createTeam = async (req, res, next) => {
    try {
        const { name, description, team_lead_id } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Team name is required.' });
        }

        const result = await query(
            'SELECT * FROM sp_create_team($1, $2, $3)',
            [name, description || null, team_lead_id || null]
        );

        res.status(201).json({
            message: 'Team created successfully.',
            team: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add member to team
 * POST /api/admin/teams/:id/members
 */
const addTeamMember = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required.' });
        }

        await query('SELECT sp_add_team_member($1, $2)', [parseInt(id), user_id]);

        res.json({ message: 'Team member added successfully.' });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all categories
 * GET /api/admin/categories
 */
const getCategories = async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM sp_get_categories_with_subcategories()');

        const categories = {};
        result.rows.forEach(row => {
            if (!categories[row.cat_id]) {
                categories[row.cat_id] = {
                    id: row.cat_id,
                    name: row.cat_name,
                    description: row.cat_description,
                    subcategories: [],
                };
            }
            if (row.sub_id) {
                categories[row.cat_id].subcategories.push({
                    id: row.sub_id,
                    name: row.sub_name,
                    description: row.sub_description,
                    assigned_team_id: row.assigned_team_id,
                    assigned_team_name: row.assigned_team_name,
                });
            }
        });

        res.json({ categories: Object.values(categories) });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new category
 * POST /api/admin/categories
 */
const createCategory = async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Category name is required.' });
        }

        const result = await query(
            'SELECT * FROM sp_create_category($1, $2)',
            [name, description || null]
        );

        res.status(201).json({
            message: 'Category created successfully.',
            category: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a subcategory
 * POST /api/admin/subcategories
 */
const createSubcategory = async (req, res, next) => {
    try {
        const { category_id, name, description, assigned_team_id } = req.body;

        if (!category_id || !name) {
            return res.status(400).json({ error: 'category_id and name are required.' });
        }

        const result = await query(
            'SELECT * FROM sp_create_subcategory($1, $2, $3, $4)',
            [category_id, name, description || null, assigned_team_id || null]
        );

        res.status(201).json({
            message: 'Subcategory created successfully.',
            subcategory: result.rows[0],
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get holidays
 * GET /api/admin/holidays
 */
const getHolidays = async (req, res, next) => {
    try {
        const { year } = req.query;
        const result = await query('SELECT * FROM sp_get_holidays($1)', [year ? parseInt(year) : null]);
        res.json({ holidays: result.rows });
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new user (admin)
 * POST /api/admin/users
 */
const createUser = async (req, res, next) => {
    try {
        const { name, email, role, department, phone, password } = req.body;

        if (!name || !email || !role) {
            return res.status(400).json({ error: 'Name, email, and role are required.' });
        }

        let passwordHash = null;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        const result = await query(
            'INSERT INTO users (name, email, role, department, phone, password_hash, is_verified) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *',
            [name, email, role, department || null, phone || null, passwordHash]
        );

        res.status(201).json({
            message: 'User created successfully.',
            user: result.rows[0],
        });
    } catch (error) {
        if (error.code === '23505') { // unique violation
            return res.status(400).json({ error: 'User with this email already exists.' });
        }
        next(error);
    }
};

/**
 * Delete a user
 * DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        try {
            await query('DELETE FROM users WHERE id = $1', [id]);
            res.json({ message: 'User deleted successfully.' });
        } catch (dbErr) {
            if (dbErr.code === '23503') { // foreign key violation
                await query('UPDATE users SET is_active = FALSE WHERE id = $1', [id]);
                res.json({ message: 'User deactivated (safely preserved due to existing records/tickets).' });
            } else {
                throw dbErr;
            }
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Bulk upload users via CSV
 * POST /api/admin/users/upload
 */
const uploadUsersCSV = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file provided.' });
        }

        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                for (let i = 0; i < results.length; i++) {
                    const row = results[i];
                    try {
                        const { name, email, role, department, phone, password } = row;
                        if (!name || !email) {
                            throw new Error('Name and email are required.');
                        }
                        
                        let passwordHash = null;
                        if (password) {
                            const salt = await bcrypt.genSalt(10);
                            passwordHash = await bcrypt.hash(password, salt);
                        }
                        
                        await query(
                            'INSERT INTO users (name, email, role, department, phone, password_hash, is_verified) VALUES ($1, $2, $3, $4, $5, $6, true)',
                            [name, email, role || 'user', department || null, phone || null, passwordHash]
                        );
                        successCount++;
                    } catch (err) {
                        errorCount++;
                        errors.push(`Row ${i + 1} (${row.email || 'unknown'}): ${err.message || 'Duplicate email'}`);
                    }
                }

                fs.unlinkSync(req.file.path);

                res.status(200).json({
                    message: `Bulk upload completed. Success: ${successCount}, Failed: ${errorCount}`,
                    errors: errors.length > 0 ? errors : undefined
                });
            })
            .on('error', (err) => {
                fs.unlinkSync(req.file.path);
                next(err);
            });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        next(error);
    }
};

/**
 * Bulk upload holidays via CSV
 * POST /api/admin/holidays/upload
 */
const uploadHolidaysCSV = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No CSV file provided.' });
        }

        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                for (let i = 0; i < results.length; i++) {
                    const row = results[i];
                    try {
                        const { name, date, is_recurring } = row;
                        if (!name || !date) {
                            throw new Error('Name and date are required.');
                        }
                        
                        await query(
                            'INSERT INTO holidays (name, holiday_date, is_recurring) VALUES ($1, $2, $3)',
                            [name, date, is_recurring === 'true' || is_recurring === '1' || is_recurring === 'yes']
                        );
                        successCount++;
                    } catch (err) {
                        errorCount++;
                        errors.push(`Row ${i + 1} (${row.name || 'unknown'}): ${err.message || 'Duplicate or invalid date'}`);
                    }
                }

                fs.unlinkSync(req.file.path);

                res.status(200).json({
                    message: `Bulk upload completed. Success: ${successCount}, Failed: ${errorCount}`,
                    errors: errors.length > 0 ? errors : undefined
                });
            })
            .on('error', (err) => {
                fs.unlinkSync(req.file.path);
                next(err);
            });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        next(error);
    }
};

module.exports = {
    getDashboardStats,
    reportByCategory, reportByTeam, reportByTechnician, getTicketTurnaround,
    getAllUsers, createUser, uploadUsersCSV, deleteUser,
    getTeams, createTeam, addTeamMember,
    getCategories, createCategory, createSubcategory,
    getHolidays, uploadHolidaysCSV,
};
