// ============================================================
// Admin Routes
// ============================================================
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');
const {
    getDashboardStats,
    reportByCategory, reportByTeam, reportByTechnician, getTicketTurnaround,
    getAllUsers, createUser, uploadUsersCSV, deleteUser,
    getTeams, createTeam, addTeamMember,
    getCategories, createCategory, createSubcategory,
    getHolidays, uploadHolidaysCSV,
} = require('../controllers/adminController');

// All admin routes require authentication
router.use(authenticate);

// Dashboard — all authenticated users can see their stats
router.get('/dashboard', getDashboardStats);

// Reports — admin & technician
router.get('/reports/by-category', authorize('admin', 'technician'), reportByCategory);
router.get('/reports/by-team', authorize('admin', 'technician'), reportByTeam);
router.get('/reports/by-technician', authorize('admin'), reportByTechnician);
router.get('/reports/turnaround/:ticketId', authorize('admin', 'technician'), getTicketTurnaround);

// User management — admin only
router.get('/users', authorize('admin'), getAllUsers);
router.post('/users', authorize('admin'), createUser);
router.post('/users/upload', authorize('admin'), upload.single('file'), uploadUsersCSV);
router.delete('/users/:id', authorize('admin'), deleteUser);

// Team management — admin only
router.get('/teams', authorize('admin', 'technician'), getTeams);
router.post('/teams', authorize('admin'), createTeam);
router.post('/teams/:id/members', authorize('admin'), addTeamMember);

// Category management — admin only
router.get('/categories', authorize('admin', 'technician'), getCategories);
router.post('/categories', authorize('admin'), createCategory);
router.post('/subcategories', authorize('admin'), createSubcategory);

// Holidays
router.get('/holidays', getHolidays);
router.post('/holidays/upload', authorize('admin'), upload.single('file'), uploadHolidaysCSV);

module.exports = router;
