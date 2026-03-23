// ============================================================
// Email Service — Send notifications
// ============================================================
const transporter = require('../config/email');

const SMTP_CONFIGURED = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

/**
 * Send an email (or log it if SMTP not configured)
 */
const sendEmail = async ({ to, subject, html }) => {
  if (!SMTP_CONFIGURED) {
    console.log(`📧 [EMAIL LOG] To: ${to} | Subject: ${subject}`);
    return { messageId: 'log-only', logged: true };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Helpdesk <noreply@helpdesk.com>',
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    // Don't throw — emails shouldn't break the flow
    return { error: error.message };
  }
};

/**
 * Send OTP verification email
 */
const sendOtpEmail = async (email, otp, purpose = 'registration') => {
  const purposeText = purpose === 'registration'
    ? 'complete your registration'
    : 'close your ticket';

  console.log(`🔐 [OTP] For: ${email} | OTP: ${otp} | Purpose: ${purpose}`);

  return sendEmail({
    to: email,
    subject: `Helpdesk — OTP Verification (${otp})`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; background: #f8f9fa; border-radius: 12px;">
        <h2 style="color: #1a1a2e; margin-bottom: 10px;">🔐 OTP Verification</h2>
        <p style="color: #444;">Use the following OTP to ${purposeText}:</p>
        <div style="background: #1a1a2e; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #888; font-size: 13px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #aaa; font-size: 12px;">— Helpdesk Support System</p>
      </div>
    `,
  });
};

/**
 * Send ticket created notification
 */
const sendTicketCreatedEmail = async ({ email, ticketNumber, title, userName }) => {
  return sendEmail({
    to: email,
    subject: `Helpdesk — Ticket Created: ${ticketNumber}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; background: #f8f9fa; border-radius: 12px;">
        <h2 style="color: #1a1a2e;">🎫 Ticket Created</h2>
        <p style="color: #444;">Hello ${userName},</p>
        <p style="color: #444;">Your ticket has been created successfully.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; color: #888; border-bottom: 1px solid #eee;">Ticket #</td><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">${ticketNumber}</td></tr>
          <tr><td style="padding: 8px; color: #888;">Subject</td><td style="padding: 8px;">${title}</td></tr>
        </table>
        <p style="color: #444;">Our team will review and assign it shortly.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #aaa; font-size: 12px;">— Helpdesk Support System</p>
      </div>
    `,
  });
};

/**
 * Send ticket updated notification
 */
const sendTicketUpdatedEmail = async ({ email, ticketNumber, title, status, updatedBy }) => {
  return sendEmail({
    to: email,
    subject: `Helpdesk — Ticket Updated: ${ticketNumber}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; background: #f8f9fa; border-radius: 12px;">
        <h2 style="color: #1a1a2e;">🔄 Ticket Updated</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; color: #888; border-bottom: 1px solid #eee;">Ticket #</td><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">${ticketNumber}</td></tr>
          <tr><td style="padding: 8px; color: #888; border-bottom: 1px solid #eee;">Subject</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${title}</td></tr>
          <tr><td style="padding: 8px; color: #888; border-bottom: 1px solid #eee;">New Status</td><td style="padding: 8px; font-weight: bold; color: #e67e22; border-bottom: 1px solid #eee;">${status}</td></tr>
          <tr><td style="padding: 8px; color: #888;">Updated By</td><td style="padding: 8px;">${updatedBy}</td></tr>
        </table>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #aaa; font-size: 12px;">— Helpdesk Support System</p>
      </div>
    `,
  });
};

/**
 * Send ticket closed notification
 */
const sendTicketClosedEmail = async ({ email, ticketNumber, title }) => {
  return sendEmail({
    to: email,
    subject: `Helpdesk — Ticket Closed: ${ticketNumber}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; background: #f8f9fa; border-radius: 12px;">
        <h2 style="color: #27ae60;">✅ Ticket Closed</h2>
        <p style="color: #444;">The following ticket has been closed:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; color: #888; border-bottom: 1px solid #eee;">Ticket #</td><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">${ticketNumber}</td></tr>
          <tr><td style="padding: 8px; color: #888;">Subject</td><td style="padding: 8px;">${title}</td></tr>
        </table>
        <p style="color: #444;">Thank you for using the Helpdesk system. We appreciate your feedback!</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #aaa; font-size: 12px;">— Helpdesk Support System</p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendTicketCreatedEmail,
  sendTicketUpdatedEmail,
  sendTicketClosedEmail,
};
