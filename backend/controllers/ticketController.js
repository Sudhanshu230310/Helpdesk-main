// ============================================================
// Ticket Controller — CRUD, interactions, files, closure
// ============================================================
const { query } = require('../config/db');
const { createOTP, verifyOTP } = require('../services/otpService');
const { sendOtpEmail, sendTicketCreatedEmail, sendTicketUpdatedEmail, sendTicketClosedEmail } = require('../services/emailService');

/**
 * Create a new ticket
 * POST /api/tickets
 */
const createTicket = async (req, res, next) => {
    try {
        const {
            title, description, category_id, subcategory_id,
            priority, form_data, on_behalf, behalf_user_email
        } = req.body;

        if (!title || !description || !category_id) {
            return res.status(400).json({ error: 'Title, description, and category are required.' });
        }

        let behalfUserId = null;
        let creatorId = req.user.id;

        // If tech is raising on behalf of a user
        if (on_behalf && behalf_user_email) {
            const userResult = await query('SELECT * FROM sp_get_user_by_email($1)', [behalf_user_email]);
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'Behalf user not found with that email.' });
            }
            behalfUserId = userResult.rows[0].id;
        }

        // Create ticket via stored procedure
        const result = await query(
            'SELECT * FROM sp_create_ticket($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [
                title, description, category_id, subcategory_id || null,
                priority || 'medium', creatorId,
                form_data ? JSON.stringify(form_data) : null,
                on_behalf || false, behalfUserId
            ]
        );

        const ticket = result.rows[0];

        // Send email notifications
        const creatorEmail = req.user.email;
        const creatorName = req.user.name;
        await sendTicketCreatedEmail({
            email: creatorEmail,
            ticketNumber: ticket.ticket_number,
            title,
            userName: creatorName,
        });

        // If on behalf, also notify the actual user
        if (behalfUserId && behalf_user_email) {
            await sendTicketCreatedEmail({
                email: behalf_user_email,
                ticketNumber: ticket.ticket_number,
                title,
                userName: 'User',
            });
        }

        res.status(201).json({
            message: 'Ticket created successfully.',
            ticket: {
                id: ticket.ticket_id,
                ticket_number: ticket.ticket_number,
                assigned_team_id: ticket.assigned_team_id,
                assigned_to: ticket.assigned_to,
                status: ticket.status,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get list of tickets with filters
 * GET /api/tickets
 */
const getTickets = async (req, res, next) => {
    try {
        const {
            status, category_id, assigned_to, team_id,
            search, page = 1, limit = 20
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await query(
            'SELECT * FROM sp_get_tickets($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [
                req.user.id, req.user.role,
                status || null, category_id ? parseInt(category_id) : null,
                assigned_to || null, team_id ? parseInt(team_id) : null,
                search || null, parseInt(limit), offset
            ]
        );

        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
            tickets: result.rows.map(r => ({ ...r, total_count: undefined })),
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
 * Get single ticket by ID
 * GET /api/tickets/:id
 */
const getTicketById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const ticketResult = await query('SELECT * FROM sp_get_ticket_by_id($1)', [id]);
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }

        const ticket = ticketResult.rows[0];

        // Check access: only creator, behalf user, assigned technician, or admin
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        const isCreator = ticket.created_by === userId;
        const isBehalfUser = ticket.behalf_user_id === userId;
        const isAssigned = ticket.assigned_to === userId;

        if (!isAdmin && !isCreator && !isBehalfUser && !isAssigned) {
            // Check if user is in assigned team
            if (ticket.assigned_team_id) {
                const teamCheck = await query(
                    'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
                    [ticket.assigned_team_id, userId]
                );
                if (teamCheck.rows.length === 0) {
                    return res.status(403).json({ error: 'You do not have access to this ticket.' });
                }
            } else {
                return res.status(403).json({ error: 'You do not have access to this ticket.' });
            }
        }

        // Get interactions
        const includeInternal = req.user.role !== 'user';
        const interactions = await query(
            'SELECT * FROM sp_get_ticket_interactions($1, $2)',
            [id, includeInternal]
        );

        // Get files
        const files = await query('SELECT * FROM sp_get_ticket_files($1)', [id]);

        // Get items provided/replaced
        const items = await query('SELECT * FROM sp_get_ticket_items($1)', [id]);

        // Get feedback (if closed)
        let feedback = null;
        if (ticket.status === 'closed') {
            const fbResult = await query('SELECT * FROM sp_get_feedback($1)', [id]);
            feedback = fbResult.rows.length > 0 ? fbResult.rows[0] : null;
        }

        res.json({
            ticket,
            interactions: interactions.rows,
            files: files.rows,
            items: items.rows,
            feedback,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Add interaction to a ticket
 * POST /api/tickets/:id/interact
 */
const addInteraction = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { message, is_internal } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required.' });
        }

        // Only allow internal notes for technicians/admins
        const isInternal = (req.user.role !== 'user') && (is_internal || false);

        const result = await query(
            'SELECT sp_add_ticket_interaction($1, $2, $3, $4)',
            [id, req.user.id, message, isInternal]
        );

        // Get ticket info for email notifications
        const ticketResult = await query('SELECT * FROM sp_get_ticket_by_id($1)', [id]);
        if (ticketResult.rows.length > 0) {
            const ticket = ticketResult.rows[0];
            // Notify relevant parties
            const notifyEmails = new Set();
            if (ticket.creator_email) notifyEmails.add(ticket.creator_email);
            if (ticket.assignee_email) notifyEmails.add(ticket.assignee_email);
            // Remove the sender's own email
            notifyEmails.delete(req.user.email);

            for (const email of notifyEmails) {
                await sendTicketUpdatedEmail({
                    email,
                    ticketNumber: ticket.ticket_number,
                    title: ticket.title,
                    status: 'New message',
                    updatedBy: req.user.name,
                });
            }
        }

        res.status(201).json({ message: 'Interaction added.' });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload files to a ticket
 * POST /api/tickets/:id/upload
 */
const uploadFiles = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }

        const uploaded = [];
        for (const file of req.files) {
            await query(
                'SELECT sp_add_ticket_file($1, $2, $3, $4, $5, $6)',
                [id, req.user.id, file.originalname, file.filename, file.size, file.mimetype]
            );
            uploaded.push({
                original_name: file.originalname,
                stored_name: file.filename,
                size: file.size,
            });
        }

        res.status(201).json({
            message: `${uploaded.length} file(s) uploaded successfully.`,
            files: uploaded,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Request ticket closure OTP
 * POST /api/tickets/:id/request-close
 */
const requestClose = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Get ticket to find the user's email
        const ticketResult = await query('SELECT * FROM sp_get_ticket_by_id($1)', [id]);
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }

        const ticket = ticketResult.rows[0];

        // Determine the user email for OTP (the actual user, not the technician)
        const userEmail = ticket.behalf_user_id
            ? (await query('SELECT email FROM users WHERE id = $1', [ticket.behalf_user_id])).rows[0]?.email
            : ticket.creator_email;

        if (!userEmail) {
            return res.status(400).json({ error: 'Cannot determine user email for OTP.' });
        }

        // Generate and send closure OTP
        const otp = await createOTP(userEmail, 'ticket_closure', null, id);
        await sendOtpEmail(userEmail, otp, 'ticket_closure');

        res.json({
            message: 'Closure OTP sent to the user.',
            email: userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Close a ticket with OTP verification
 * POST /api/tickets/:id/close
 */
const closeTicket = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { otp, email } = req.body;

        if (!otp || !email) {
            return res.status(400).json({ error: 'OTP and email are required.' });
        }

        // Verify OTP
        const otpResult = await verifyOTP(email, otp, 'ticket_closure');
        if (!otpResult.isValid) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }

        // Close the ticket
        const result = await query('SELECT * FROM sp_close_ticket($1, $2)', [id, req.user.id]);
        const ticketInfo = result.rows[0];

        // Send closure emails to all stakeholders
        const emails = new Set();
        if (ticketInfo.creator_email) emails.add(ticketInfo.creator_email);
        if (ticketInfo.assignee_email) emails.add(ticketInfo.assignee_email);

        // Also notify admin(s)
        const admins = await query("SELECT email FROM users WHERE role = 'admin' AND is_active = TRUE");
        admins.rows.forEach(a => emails.add(a.email));

        for (const recipientEmail of emails) {
            await sendTicketClosedEmail({
                email: recipientEmail,
                ticketNumber: ticketInfo.ticket_number,
                title: ticketInfo.ticket_title,
            });
        }

        res.json({ message: 'Ticket closed successfully.' });
    } catch (error) {
        next(error);
    }
};

/**
 * Submit feedback for a closed ticket
 * POST /api/tickets/:id/feedback
 */
const submitFeedback = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        // Verify ticket is closed
        const ticketResult = await query('SELECT status FROM tickets WHERE id = $1', [id]);
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found.' });
        }
        if (ticketResult.rows[0].status !== 'closed') {
            return res.status(400).json({ error: 'Feedback can only be submitted for closed tickets.' });
        }

        await query(
            'SELECT sp_submit_feedback($1, $2, $3, $4)',
            [id, req.user.id, rating, comment || null]
        );

        res.json({ message: 'Feedback submitted successfully.' });
    } catch (error) {
        next(error);
    }
};

/**
 * Add item provided/replaced on a ticket
 * POST /api/tickets/:id/items
 */
const addItem = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { item_name, item_type, quantity, serial_number, notes } = req.body;

        if (!item_name) {
            return res.status(400).json({ error: 'Item name is required.' });
        }

        await query(
            'SELECT sp_add_ticket_item($1, $2, $3, $4, $5, $6, $7)',
            [id, item_name, item_type || null, quantity || 1, serial_number || null, notes || null, req.user.id]
        );

        res.status(201).json({ message: 'Item added successfully.' });
    } catch (error) {
        next(error);
    }
};

/**
 * Get categories with subcategories (public for form)
 * GET /api/tickets/categories
 */
const getCategories = async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM sp_get_categories_with_subcategories()');

        // Group by category
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
 * Get form fields for a subcategory
 * GET /api/tickets/form-fields/:subcategoryId
 */
const getFormFields = async (req, res, next) => {
    try {
        const { subcategoryId } = req.params;
        const result = await query('SELECT * FROM sp_get_form_fields($1)', [parseInt(subcategoryId)]);
        res.json({ fields: result.rows });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTicket, getTickets, getTicketById,
    addInteraction, uploadFiles,
    requestClose, closeTicket,
    submitFeedback, addItem,
    getCategories, getFormFields,
};
