// ============================================================
// User Routes
// ============================================================
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getProfile, updateProfile } = require('../controllers/userController');

// All user routes require authentication
router.use(authenticate);

// GET /api/users/profile — Get current user profile
router.get('/profile', getProfile);

// PUT /api/users/profile — Update current user profile
router.put('/profile', updateProfile);

module.exports = router;
