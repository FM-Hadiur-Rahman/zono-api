// // src/services/mailer.service.js
// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';
// dotenv.config();

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER, // e.g., zonoworkforce@gmail.com
//     pass: process.env.EMAIL_PASS, // 16-char Gmail App Password
//   },
// });

// export const sendMail = async ({ to, subject, html, attachments }) => {
//   const mailOptions = {
//     from: `"Zono" <${process.env.EMAIL_USER}>`,
//     to,
//     subject,
//     html,
//     attachments,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     console.log(`📧 Email sent to ${to}`);
//   } catch (error) {
//     console.error('❌ Failed to send email:', error.message);
//     throw error; // let your controller handle 502 if needed
//   }
// };

// src/services/mailer.service.js
import nodemailer from 'nodemailer';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first'); // avoid IPv6 stalls on some hosts

const EMAIL_ENABLED =
  String(process.env.EMAIL_ENABLED).toLowerCase() === 'true';

// Minimal Gmail transport (no host/port!)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // e.g., zonoworkforce@gmail.com
    pass: process.env.EMAIL_PASS, // 16-char App Password, NO SPACES
  },
  pool: true,
  maxConnections: 3,
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  family: 4,
});

// Optional: enable Nodemailer internal logging in production
if (process.env.NODE_ENV === 'production') {
  transporter.set('logger', true);
  transporter.set('debug', true);
}

export async function sendMail({ to, subject, html, text, attachments }) {
  if (!EMAIL_ENABLED) return { skipped: true };

  const mailOptions = {
    from: `"Zono" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Gmail sent to ${to} (${info.messageId})`);
    return info;
  } catch (err) {
    // log ALL the useful bits
    console.error('❌ Gmail send failed:', {
      code: err.code,
      name: err.name,
      message: err.message,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
    });
    throw err; // let the route decide how to reply
  }
}

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
