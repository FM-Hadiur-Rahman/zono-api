// src/services/mailer.service.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // e.g., zonoworkforce@gmail.com
    pass: process.env.EMAIL_PASS, // 16-char Gmail App Password
  },
});

export const sendMail = async ({ to, subject, html, attachments }) => {
  const mailOptions = {
    from: `"Zono" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    throw error; // let your controller handle 502 if needed
  }
};

// Minimal HTTP sender (Resend). No SMTP ports involved.
// export async function sendMail({ to, subject, html, text }) {
//   if (String(process.env.EMAIL_ENABLED).toLowerCase() !== 'true')
//     return { skipped: true };

//   const key = process.env.RESEND_API_KEY;
//   if (!key) throw new Error('Missing RESEND_API_KEY');

//   const r = await fetch('https://api.resend.com/emails', {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${key}`,
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       from: process.env.EMAIL_FROM || 'Zono <no-reply@zono.app>',
//       to: [to],
//       subject,
//       html,
//       text,
//     }),
//   });

//   if (!r.ok) {
//     const t = await r.text();
//     throw new Error(`Resend ${r.status}: ${t}`);
//   }
//   return r.json();
// }
