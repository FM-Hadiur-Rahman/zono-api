import crypto from 'crypto';
export const genToken = (bytes = 24) =>
  crypto.randomBytes(bytes).toString('hex');
export const addHours = (date, hours) => {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
};
