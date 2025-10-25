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

// Core middleware
// app.use(
//   cors({
//     origin: 'http://localhost:5173',
//     credentials: false,
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant'],
//   }),
// );
app.use(cors());
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
