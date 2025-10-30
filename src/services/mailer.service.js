// src/services/mailer.service.js
const isProd = process.env.NODE_ENV === 'production';
const hasResend = !!process.env.RESEND_API_KEY;
const emailEnabled =
  String(process.env.EMAIL_ENABLED || '').toLowerCase() === 'true';

/**
 * sendMail({ to, subject, html, text, attachments })
 * - in production (Render): uses Resend HTTPS (no SMTP ports)
 * - in dev/local: uses Gmail SMTP with App Password
 */
export async function sendMail({
  to,
  subject,
  html,
  text,
  attachments,
  from,
} = {}) {
  if (!emailEnabled) return { skipped: true };

  if (!to || !subject || (!html && !text)) {
    throw new Error("sendMail: missing 'to', 'subject', or 'html/text'");
  }
  const resolvedFrom =
    from || process.env.EMAIL_FROM || 'Zono <no-reply@zono.works>';
  // --- Production: Resend (HTTP, reliable on Render) ---
  if (isProd && hasResend) {
    const payload = {
      from: resolvedFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    };
    if (attachments?.length) {
      // Resend expects: [{ filename, content (base64), path?, contentType? }]
      payload.attachments = attachments;
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`Resend ${r.status} (from=${resolvedFrom}): ${body}`);
    }
    const data = await r.json();
    console.log('✅ Email via Resend:', { id: data.id, from: resolvedFrom });
    return { ok: true, id: data.id, transport: 'resend' };
  }

  // --- Development: Gmail SMTP (works on localhost) ---
  const nodemailer = (await import('nodemailer')).default;
  const tx = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // strip spaces
    },
  });

  const info = await tx.sendMail({
    from: resolvedFrom || `"Zono" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
    attachments, // nodemailer: [{ filename, path|content, contentType }]
  });

  console.log('✅ Email via Gmail SMTP:', info.messageId);
  return { ok: true, id: info.messageId, transport: 'gmail' };
}
