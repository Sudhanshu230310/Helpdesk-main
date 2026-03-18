// ============================================================
// Email Configuration — Nodemailer Transporter
// ============================================================
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verify transporter on startup (non-blocking)
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter.verify()
        .then(() => console.log('📧 SMTP connection verified'))
        .catch((err) => console.warn('⚠️  SMTP not configured:', err.message));
} else {
    console.warn('⚠️  SMTP credentials not set — emails will be logged only');
}

module.exports = transporter;
