// src/middlewares/error.middleware.js
// src/middlewares/error.middleware.js
export function errorHandler(err, _req, res, _next) {
  console.error('❌', err.stack || err); // <- print the real cause
  res
    .status(err.status || 500)
    .json({ error: err.message || 'Internal Server Error' });
}
