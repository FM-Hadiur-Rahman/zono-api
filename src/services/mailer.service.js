// src/services/mailer.service.js
import nodemailer from 'nodemailer';

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
let transporter;

function getTransporter() {
  if (!EMAIL_ENABLED) return null;
  if (transporter) return transporter;

  // Gmail
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // <-- no spaces
    },
  });

  return transporter;
}

export async function sendMail({ to, subject, html, text }) {
  if (!EMAIL_ENABLED) return { skipped: true };

  try {
    const tx = getTransporter();
    return await tx.sendMail({
      from: `"Zono" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('✉️ Mail error:', err.message);
    // Don't throw — avoid crashing the route
    return { error: true, message: err.message };
  }
}
