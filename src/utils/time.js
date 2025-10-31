// src/utils/time.js
export const toISODate = (d = new Date(), tz = 'Europe/Berlin') =>
  new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d) + 'T00:00:00Z',
  ); // normalized UTC midnight for that tz

export const diffMinutes = (a, b) => Math.max(0, Math.round((b - a) / 60000));
