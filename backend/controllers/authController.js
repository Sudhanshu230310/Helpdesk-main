// ============================================================
// Auth Controller — Registration, Login, OTP, LDAP
// ============================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { createOTP, verifyOTP } = require('../services/otpService');
const { sendOtpEmail } = require('../services/emailService');
const { ldapAuthenticate } = require('../services/ldapService');

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { name, email, password, phone, department } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user via stored procedure
        const result = await query(
            'SELECT * FROM sp_register_user($1, $2, $3, $4, $5)',
            [name, email, passwordHash, phone || null, department || null]
        );

        const user = result.rows[0];

        // Generate and send OTP for email verification
        const otp = await createOTP(email, 'registration', user.user_id);
        await sendOtpEmail(email, otp, 'registration');

        res.status(201).json({
            message: 'Registration successful. Please verify your email with the OTP sent.',
            userId: user.user_id,
            email: user.user_email,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Verify email OTP after registration
 * POST /api/auth/verify-otp
 */
const verifyRegistrationOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required.' });
        }

        const result = await verifyOTP(email, otp, 'registration');

        if (!result.isValid) {
            return res.status(400).json({ error: 'Invalid or expired OTP.' });
        }

        // Mark user as verified
        await query('SELECT sp_verify_user($1)', [email]);

        res.json({ message: 'Email verified successfully. You can now login.' });
    } catch (error) {
        next(error);
    }
};

/**
 * Resend OTP
 * POST /api/auth/resend-otp
 */
const resendOTP = async (req, res, next) => {
    try {
        const { email, purpose } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const otp = await createOTP(email, purpose || 'registration');
        await sendOtpEmail(email, otp, purpose || 'registration');

        res.json({ message: 'OTP resent successfully.' });
    } catch (error) {
        next(error);
    }
};

/**
 * Login with email/password
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Get user
        const result = await query('SELECT * FROM sp_get_user_by_email($1)', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = result.rows[0];

        // Check if active
        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is deactivated.' });
        }

        // Check if verified
        if (!user.is_verified) {
            // Resend OTP
            const otp = await createOTP(email, 'registration', user.id);
            await sendOtpEmail(email, otp, 'registration');
            return res.status(403).json({
                error: 'Email not verified. A new OTP has been sent.',
                requiresVerification: true,
            });
        }

        // Verify password
        if (!user.password_hash) {
            return res.status(401).json({ error: 'Please use LDAP login.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * LDAP Login for technicians
 * POST /api/auth/ldap-login
 */
const ldapLogin = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const result = await ldapAuthenticate(username, password);

        if (!result.success) {
            return res.status(401).json({ error: result.error || 'LDAP authentication failed.' });
        }

        // Upsert user in our DB
        const dbResult = await query(
            'SELECT * FROM sp_upsert_ldap_user($1, $2, $3, $4)',
            [result.user.name, result.user.email, result.user.ldap_dn, result.user.department]
        );

        const dbUser = dbResult.rows[0];

        // Generate JWT
        const token = jwt.sign(
            { id: dbUser.user_id, email: dbUser.user_email, role: dbUser.user_role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'LDAP login successful',
            user: {
                id: dbUser.user_id,
                name: dbUser.user_name,
                email: dbUser.user_email,
                role: dbUser.user_role,
                department: result.user.department,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout and clear cookie
 * POST /api/auth/logout
 */
const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logout successful' });
};

/**
 * Get current user
 * GET /api/auth/me
 */
const me = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ error: 'Not authenticated' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await query('SELECT * FROM sp_get_user_by_id($1)', [decoded.id]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'User not found' });
        
        const user = result.rows[0];
        if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });

        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
            }
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = { register, verifyRegistrationOTP, resendOTP, login, ldapLogin, logout, me };
