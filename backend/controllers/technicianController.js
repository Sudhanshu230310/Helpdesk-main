// ============================================================
// Technician Controller — Ticket management for technicians
// ============================================================
const { query } = require('../config/db');
const { sendTicketUpdatedEmail } = require('../services/emailService');

/**
 * Get tickets assigned to the technician
 * GET /api/technicians/tickets
 */
const getMyTickets = async (req, res, next) => {
    try {
        const { status, category_id, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await query(
            'SELECT * FROM sp_get_tickets($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [
                req.user.id, 'technician',
                status || null, category_id ? parseInt(category_id) : null,
                req.user.id, null,
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
 * Assign/reassign a ticket to a technician
 * PUT /api/technicians/tickets/:id/assign
 */
const assignTicket = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { assigned_to } = req.body;

        if (assigned_to === undefined) {
            return res.status(400).json({ error: 'assigned_to is required (can be null).' });
        }

        await query('SELECT sp_assign_ticket($1, $2, $3)', [id, assigned_to || null, req.user.id]);

        // Get ticket info for notification
        const ticketResult = await query('SELECT * FROM sp_get_ticket_by_id($1)', [id]);
        if (ticketResult.rows.length > 0) {
            const ticket = ticketResult.rows[0];

            // Notify the new assignee
            if (ticket.assignee_email) {
                await sendTicketUpdatedEmail({
                    email: ticket.assignee_email,
                    ticketNumber: ticket.ticket_number,
                    title: ticket.title,
                    status: 'Assigned to you',
                    updatedBy: req.user.name,
                });
            }

            // Notify the creator
            if (ticket.creator_email) {
                await sendTicketUpdatedEmail({
                    email: ticket.creator_email,
                    ticketNumber: ticket.ticket_number,
                    title: ticket.title,
                    status: 'Assigned to technician',
                    updatedBy: req.user.name,
                });
            }
        }

        res.json({ message: 'Ticket assigned successfully.' });
    } catch (error) {
        next(error);
    }
};

/**
 * Update ticket status
 * PUT /api/technicians/tickets/:id/status
 */
const updateTicketStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['open', 'in_progress', 'with_user', 'resolved'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Status must be one of: ${validStatuses.join(', ')}. Use the close endpoint to close tickets.`,
            });
        }

        await query('SELECT sp_update_ticket_status($1, $2, $3)', [id, status, req.user.id]);

        // Notify stakeholders
        const ticketResult = await query('SELECT * FROM sp_get_ticket_by_id($1)', [id]);
        if (ticketResult.rows.length > 0) {
            const ticket = ticketResult.rows[0];
            const notifyEmails = new Set();
            if (ticket.creator_email) notifyEmails.add(ticket.creator_email);
            if (ticket.assignee_email) notifyEmails.add(ticket.assignee_email);
            notifyEmails.delete(req.user.email);

            for (const email of notifyEmails) {
                await sendTicketUpdatedEmail({
                    email,
                    ticketNumber: ticket.ticket_number,
                    title: ticket.title,
                    status: status.replace('_', ' '),
                    updatedBy: req.user.name,
                });
            }
        }

        res.json({ message: `Ticket status updated to "${status}".` });
    } catch (error) {
        next(error);
    }
};

/**
 * Get team members (for assignment dropdown)
 * GET /api/technicians/team-members
 */
const getTeamMembers = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT u.id, u.name, u.email, u.department, t.name AS team_name
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       JOIN teams t ON tm.team_id = t.id
       WHERE u.role IN ('technician', 'admin') AND u.is_active = TRUE
       ORDER BY t.name, u.name`
        );

        res.json({ members: result.rows });
    } catch (error) {
        next(error);
    }
};

module.exports = { getMyTickets, assignTicket, updateTicketStatus, getTeamMembers };
