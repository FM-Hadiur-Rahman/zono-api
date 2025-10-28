// src/services/mailer.service.js (Zono)
import nodemailer from 'nodemailer';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first'); // avoid IPv6 on Render

const EMAIL_ENABLED =
  String(process.env.EMAIL_ENABLED).toLowerCase() === 'true';

const transporter = nodemailer.createTransport({
  service: 'gmail', // let Nodemailer pick host/port/secure
  auth: {
    user: process.env.EMAIL_USER, // e.g. zonoworkforce@gmail.com
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
  pool: true, // reuse connections, helps with transient TLS handshakes
  maxConnections: 3,
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  // Force IPv4 sockets to dodge AAAA routes that can hang on some hosts
  family: 4,
});

export async function sendMail({ to, subject, html, text, attachments }) {
  if (!EMAIL_ENABLED) {
    console.info('✉️ EMAIL_ENABLED=false → skipping');
    return { skipped: true };
  }
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
    console.log('✅ Email sent:', info.messageId);
    return { ok: true, id: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    throw err; // let the route return 502 so UI shows a toast error
  }
}
// async function sendViaResend({ to, subject, html, text }) {
//   const key = process.env.RESEND_API_KEY;
//   if (!key) throw new Error("Missing RESEND_API_KEY");
//   const r = await fetch("https://api.resend.com/emails", {
//     method: "POST",
//     headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
//     body: JSON.stringify({ from: process.env.EMAIL_FROM || `Zono <no-reply@zono.app>`, to: [to], subject, html, text }),
//   });
//   if (!r.ok) throw new Error(`Resend error ${r.status}`);
//   return r.json();
// }

// // swap inside sendMail try{}:  if Gmail throws ETIMEDOUT, fall back:
// try {
//   const info = await transporter.sendMail(mailOptions);
//   return { ok: true, id: info.messageId };
// } catch (e) {
//   if (process.env.RESEND_API_KEY) {
//     console.warn("SMTP failed, falling back to Resend:", e.message);
//     return await sendViaResend({ to, subject, html, text, attachments });
//   }
//   throw e;
// }
