// utils/ics.js
export function buildShiftIcs({ title, date, start, end, description = '' }) {
  // date = 'YYYY-MM-DD', start/end = 'HH:mm'
  const [y, m, d] = date.split('-').map(Number);
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);

  // Use local time -> "floating" ICS (no TZ). If you want TZ-aware, use ics + tzid.
  const dt = (yy, mm, dd, hh, mi) =>
    `${yy}${String(mm).padStart(2, '0')}${String(dd).padStart(2, '0')}T${String(hh).padStart(2, '0')}${String(mi).padStart(2, '0')}00`;

  const uid = `zono-${Date.now()}-${Math.random().toString(36).slice(2)}@zono.local`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zono//Shift//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dt(y, m, d, sh, sm)}`,
    `DTSTART:${dt(y, m, d, sh, sm)}`,
    `DTEND:${dt(y, m, d, eh, em)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function escapeIcs(s = '') {
  return String(s)
    .replace(/([,;])/g, '\\$1')
    .replace(/\n/g, '\\n');
}
