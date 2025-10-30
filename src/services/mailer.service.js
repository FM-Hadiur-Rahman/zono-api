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
// src/services/mailer.service.js
import nodemailer from 'nodemailer';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

const EMAIL = process.env.EMAIL_USER;
const PASS = process.env.EMAIL_PASS;
const ENABLED = String(process.env.EMAIL_ENABLED).toLowerCase() === 'true';

const base = {
  host: 'smtp.gmail.com',
  auth: { user: EMAIL, pass: PASS },
  pool: true,
  maxConnections: 2,
  connectionTimeout: 10000,
  greetingTimeout: 8000,
  family: 4, // force IPv4
};

const C465 = { ...base, port: 465, secure: true };
const C587 = {
  ...base,
  port: 587,
  secure: false,
  requireTLS: true,
  tls: { servername: 'smtp.gmail.com' },
};

let transporter; // active working transporter
let fallbackTried = false;

async function tryCreate(cfg) {
  const t = nodemailer.createTransport(cfg);
  await t.verify(); // actually opens the socket; throws on ETIMEDOUT/ECONNECTION
  return t;
}

async function getTransporter() {
  if (transporter) return transporter;
  if (!ENABLED) throw new Error('EMAIL_ENABLED=false');

  // Try 465 first, then 587
  try {
    transporter = await tryCreate(C465);
    console.log('📮 Gmail SMTP ready on 465 (SSL)');
  } catch (e) {
    console.warn('⚠️  465 failed:', e.code || e.message, '→ trying 587');
    transporter = await tryCreate(C587);
    console.log('📮 Gmail SMTP ready on 587 (STARTTLS)');
  }
  return transporter;
}

export async function sendMail({ to, subject, html, text, attachments }) {
  if (!ENABLED) return { skipped: true };

  const mail = {
    from: `"Zono" <${EMAIL}>`,
    to,
    subject,
    html,
    text,
    attachments,
  };

  try {
    const tx = await getTransporter();
    const info = await tx.sendMail(mail);
    console.log(`✅ Sent to ${to} (${info.messageId})`);
    return info;
  } catch (err) {
    // If first attempt timed out on one port, auto-retry the other once
    if (err && err.code === 'ETIMEDOUT' && !fallbackTried) {
      fallbackTried = true;
      try {
        // swap config and retry
        transporter =
          transporter?.options?.port === 465
            ? await tryCreate(C587)
            : await tryCreate(C465);
        console.warn('🔁 Retrying via alternate Gmail port...');
        const info = await transporter.sendMail(mail);
        console.log(`✅ Sent to ${to} (${info.messageId})`);
        return info;
      } catch (e2) {
        console.error('❌ Retry failed:', e2.code || e2.message);
        throw e2;
      }
    }
    console.error('❌ Gmail send failed:', err.code || err.message);
    throw err;
  } finally {
    fallbackTried = false;
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
