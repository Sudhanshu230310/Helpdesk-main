// ============================================================
// Auth Routes
// ============================================================
const express = require('express');
const router = express.Router();
const {
    register, verifyRegistrationOTP, resendOTP,
    login, ldapLogin, logout, me
} = require('../controllers/authController');

// POST /api/auth/register — Register a new user
router.post('/register', register);

// POST /api/auth/verify-otp — Verify email OTP
router.post('/verify-otp', verifyRegistrationOTP);

// POST /api/auth/resend-otp — Resend OTP
router.post('/resend-otp', resendOTP);

// POST /api/auth/login — Email/password login
router.post('/login', login);

// POST /api/auth/ldap-login — LDAP login for technicians
router.post('/ldap-login', ldapLogin);

// POST /api/auth/logout — Logout user
router.post('/logout', logout);

// GET /api/auth/me — Get user from session cookie
router.get('/me', me);

module.exports = router;
