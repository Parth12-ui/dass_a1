const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

let transporter = null;

/**
 * Get or create the mail transporter.
 * - If SMTP_HOST + SMTP_USER + SMTP_PASS are set, uses real SMTP (Gmail, etc.)
 * - Otherwise, logs emails to console + saves to /uploads/emails/ (dev mode)
 */
function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log(`📧 Email: Using SMTP (${process.env.SMTP_HOST})`);
  } else {
    // Dev mode: use stream transport that captures output
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    console.log('📧 Email: Dev mode — emails logged to console & saved to uploads/emails/');
  }

  return transporter;
}

const FROM = process.env.SMTP_FROM || 'Felicity <noreply@felicity.iiit.ac.in>';

/**
 * Internal helper to send an email
 * In dev mode (no SMTP configured): logs to console and saves JSON to disk
 * In production mode (SMTP configured): actually sends the email
 */
async function sendMail(mailOptions) {
  const t = getTransporter();
  const info = await t.sendMail(mailOptions);

  // Dev mode: jsonTransport returns the email as JSON in info.message
  if (info.message) {
    const emailData = JSON.parse(info.message);
    console.log(`\n📬 Email sent (dev mode):`);
    console.log(`   To: ${mailOptions.to}`);
    console.log(`   Subject: ${mailOptions.subject}`);

    // Save to file for inspection
    const emailDir = path.join(__dirname, '../uploads/emails');
    if (!fs.existsSync(emailDir)) fs.mkdirSync(emailDir, { recursive: true });
    const filename = `${Date.now()}-${mailOptions.subject.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}.json`;
    const filepath = path.join(emailDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(emailData, null, 2));
    console.log(`   Saved: /uploads/emails/${filename}`);
  } else {
    console.log(`📬 Email sent to ${mailOptions.to}: ${mailOptions.subject}`);
  }

  return info;
}

/**
 * Send a ticket confirmation email
 */
const sendTicketEmail = async (to, ticketData) => {
  const { ticketId, eventName, eventDate, participantName, qrCode } = ticketData;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>🎉 Registration Confirmed!</h2>
      <p>Hi <strong>${participantName}</strong>,</p>
      <p>You have successfully registered for <strong>${eventName}</strong>.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Ticket ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${ticketId}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Event</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${eventName}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${eventDate}</td></tr>
      </table>
      ${qrCode ? `<p><strong>Your QR Code:</strong></p><img src="${qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />` : ''}
      <p style="color: #666; font-size: 12px;">Please keep this email for your records.</p>
    </div>
  `;

  try {
    return await sendMail({
      from: FROM,
      to,
      subject: `Ticket Confirmation: ${eventName} [${ticketId}]`,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

/**
 * Send credentials email to a new organizer
 */
const sendCredentialsEmail = async (to, credentials) => {
  const { loginEmail, password, organizerName } = credentials;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Felicity!</h2>
      <p>Hi <strong>${organizerName}</strong>,</p>
      <p>Your organizer account has been created. Here are your login credentials:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Login Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${loginEmail}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Password</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${password}</td></tr>
      </table>
      <p><strong>Please change your password after first login.</strong></p>
    </div>
  `;

  try {
    return await sendMail({
      from: FROM,
      to,
      subject: `Your Felicity Organizer Credentials`,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

/**
 * Send password reset notification
 */
const sendPasswordResetEmail = async (to, data) => {
  const { organizerName, newPassword } = data;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset</h2>
      <p>Hi <strong>${organizerName}</strong>,</p>
      <p>Your password has been reset by the administrator.</p>
      <p><strong>New Password:</strong> ${newPassword}</p>
      <p>Please change your password after logging in.</p>
    </div>
  `;

  try {
    return await sendMail({
      from: FROM,
      to,
      subject: `Password Reset - Felicity`,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

/**
 * Send team invite email
 */
const sendTeamInviteEmail = async (to, inviteData) => {
  const { teamName, eventName, leaderName, inviteCode } = inviteData;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>🤝 Team Invitation</h2>
      <p>You've been invited to join team <strong>${teamName}</strong> for <strong>${eventName}</strong> by ${leaderName}.</p>
      <p><strong>Invite Code:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-size: 18px;">${inviteCode}</code></p>
      <p>Use this code on the event page to join the team.</p>
    </div>
  `;

  try {
    return await sendMail({
      from: FROM,
      to,
      subject: `Team Invitation: ${teamName} — ${eventName}`,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

/**
 * Send merchandise order approval/rejection email
 */
const sendMerchApprovalEmail = async (to, orderData) => {
  const { participantName, eventName, ticketId, qrCode, status } = orderData;
  const isApproved = status === 'approved';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${isApproved ? '✅ Order Approved!' : '❌ Order Rejected'}</h2>
      <p>Hi <strong>${participantName}</strong>,</p>
      <p>Your merchandise order for <strong>${eventName}</strong> has been <strong>${status}</strong>.</p>
      ${isApproved && ticketId ? `
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Ticket ID</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${ticketId}</td></tr>
        </table>
        ${qrCode ? `<p><strong>Your QR Code:</strong></p><img src="${qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />` : ''}
      ` : ''}
      ${!isApproved ? '<p>Please contact the organizer for more details.</p>' : ''}
    </div>
  `;

  try {
    return await sendMail({
      from: FROM,
      to,
      subject: `Order ${isApproved ? 'Approved' : 'Rejected'}: ${eventName}`,
      html,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
};

module.exports = {
  sendTicketEmail,
  sendCredentialsEmail,
  sendPasswordResetEmail,
  sendTeamInviteEmail,
  sendMerchApprovalEmail,
};
