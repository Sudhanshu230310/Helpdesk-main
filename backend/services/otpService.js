// ============================================================
// OTP Service — Generate, store, and verify OTPs
// ============================================================
const { query } = require('../config/db');

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create and store an OTP in the database
 * @param {string} email
 * @param {string} purpose - 'registration' or 'ticket_closure'
 * @param {string|null} userId
 * @param {string|null} ticketId
 * @returns {Promise<string>} The generated OTP code
 */
const createOTP = async (email, purpose, userId = null, ticketId = null) => {
    const otp = generateOTP();

    await query(
        'SELECT sp_create_otp($1, $2, $3, $4, $5)',
        [email, otp, purpose, userId, ticketId]
    );

    return otp;
};

/**
 * Verify an OTP from the database
 * @param {string} email
 * @param {string} otpCode
 * @param {string} purpose
 * @returns {Promise<{isValid: boolean, userId: string|null, ticketId: string|null}>}
 */
const verifyOTP = async (email, otpCode, purpose) => {
    const result = await query(
        'SELECT * FROM sp_verify_otp($1, $2, $3)',
        [email, otpCode, purpose]
    );

    if (result.rows.length === 0) {
        return { isValid: false, userId: null, ticketId: null };
    }

    const row = result.rows[0];
    return {
        isValid: row.is_valid,
        userId: row.otp_user_id,
        ticketId: row.otp_ticket_id,
    };
};

module.exports = { generateOTP, createOTP, verifyOTP };
