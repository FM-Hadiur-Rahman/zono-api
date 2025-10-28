// src/services/mailer.service.js
import nodemailer from 'nodemailer';
import dns from 'node:dns';
require('dotenv').config();
dns.setDefaultResultOrder('ipv4first'); // Avoid IPv6 timeout on Render

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
let transporter;

/**
 * Create or reuse the SMTP transporter.
 */
export function getTransporter() {
  if (!EMAIL_ENABLED) return null;
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = port === 465; // true for 465 (SSL), false for 587 (STARTTLS)

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // smtp.gmail.com
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Google App Password
    },
    connectionTimeout: 20000, // 20s
    greetingTimeout: 10000,
    requireTLS: !secure, // only needed if you switch to 587
  });

  return transporter;
}

/**
 * Send an email
 */
export async function sendMail({ to, subject, html, text }) {
  if (!EMAIL_ENABLED) {
    console.warn('📧 Email disabled (EMAIL_ENABLED=false)');
    return { skipped: true };
  }

  try {
    const tx = getTransporter();
    const info = await tx.sendMail({
      from: `"Zono" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`✅ Mail sent: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('✉️ Mail error:', err.message);
    return { error: true, message: err.message };
  }
}
