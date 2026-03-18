// ============================================================
// Technician Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    getMyTickets, assignTicket, updateTicketStatus, getTeamMembers,
} = require('../controllers/technicianController');

// All technician routes require authentication + technician/admin role
router.use(authenticate);
router.use(authorize('technician', 'admin'));

// GET /api/technicians/tickets — Get assigned tickets
router.get('/tickets', getMyTickets);

// PUT /api/technicians/tickets/:id/assign — Assign/reassign ticket
router.put('/tickets/:id/assign', assignTicket);

// PUT /api/technicians/tickets/:id/status — Update ticket status
router.put('/tickets/:id/status', updateTicketStatus);

// GET /api/technicians/team-members — Get team members for assignment
router.get('/team-members', getTeamMembers);

module.exports = router;
