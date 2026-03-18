// ============================================================
// Ticket Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
    createTicket, getTickets, getTicketById,
    addInteraction, uploadFiles,
    requestClose, closeTicket,
    submitFeedback, addItem,
    getCategories, getFormFields,
} = require('../controllers/ticketController');

// Public routes (categories/form fields for the ticket creation form)
router.get('/categories', getCategories);
router.get('/form-fields/:subcategoryId', getFormFields);

// Protected routes — require authentication
router.use(authenticate);

// POST /api/tickets — Create a new ticket
router.post('/', createTicket);

// GET /api/tickets — List tickets (filtered by role)
router.get('/', getTickets);

// GET /api/tickets/:id — Get ticket details
router.get('/:id', getTicketById);

// POST /api/tickets/:id/interact — Add interaction/message
router.post('/:id/interact', addInteraction);

// POST /api/tickets/:id/upload — Upload files
router.post('/:id/upload', upload.array('files', 5), uploadFiles);

// POST /api/tickets/:id/request-close — Request closure OTP
router.post('/:id/request-close', authorize('technician', 'admin'), requestClose);

// POST /api/tickets/:id/close — Close ticket with OTP
router.post('/:id/close', closeTicket);

// POST /api/tickets/:id/feedback — Submit feedback (users only)
router.post('/:id/feedback', authorize('user'), submitFeedback);

// POST /api/tickets/:id/items — Add item provided/replaced (technicians/admins)
router.post('/:id/items', authorize('technician', 'admin'), addItem);

module.exports = router;
