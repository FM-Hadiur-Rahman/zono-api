import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { authRouter } from './routes/auth.router.js';
import { employeesRouter } from './routes/employees.router.js';
import { shiftsRouter } from './routes/shifts.router.js';
import notificationRouter from './routes/notification.router.js';
import { attendanceRouter } from './routes/attendance.router.js';
import { inventoryRouter } from './routes/inventory.router.js';
import { adminRouter } from './routes/admin.router.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { availabilityRouter } from './routes/availability.js';
import { swapsRouter } from './routes/swaps.js';
import { errorHandler } from './middlewares/error.middleware.js';
import invitationsRouter from './routes/invitations.router.js';

const app = express();
if (process.env.NODE_ENV === 'production') {
  // `1` = trust first proxy hop (Render)
  app.set('trust proxy', 1);
  // Alternatively:
  // app.set("trust proxy", true); // trust all proxies
}
// Core middleware
const allowlist = [
  'https://zono.works',
  'https://www.zono.works',
  'http://localhost:5173', // dev
  'http://127.0.0.1:5173',
];

const corsOptions = {
  origin(origin, cb) {
    // allow REST clients / server-to-server with no Origin header
    if (!origin) return cb(null, true);
    cb(null, allowlist.includes(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // only if you use cookies/auth headers cross-site
  maxAge: 86400,
};

app.use(cors(corsOptions));
// Handle preflight for all routes
app.options('*', cors(corsOptions));

app.use(express.json());
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
// Health endpoints
app.get('/healthz', (_req, res) => res.send('ok'));
app.get('/readyz', (_req, res) => res.send('ready'));

// Public routes
app.get('/', (_req, res) => res.json({ ok: true, name: 'zono-api' }));
app.use('/api/auth', authRouter);
app.use('/api/invitations', invitationsRouter);

// Authenticated routes
app.use(authMiddleware);
app.use('/api/availability', availabilityRouter);
app.use('/api/swaps', swapsRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/admin', adminRouter);

// (optional) central error handler goes here, if you have one:
// import { errorHandler } from './middlewares/error.js';
app.use(errorHandler);

export default app;
