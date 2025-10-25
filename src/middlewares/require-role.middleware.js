export const requireRole = (allowed) => (req, res, next) => {
  const role = req.user?.role;
  if (!role || !allowed.includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
