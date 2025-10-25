// src/realtime/socket.js
import { Server } from 'socket.io';

let io; // singleton

export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [process.env.APP_ORIGIN || 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true, // ✅ let socket.io send cookies/auth if needed
    },

    path: '/socket.io', // default, keep explicit
  });

  io.on('connection', (socket) => {
    // client should immediately send auth
    socket.on('auth', ({ userId, tenantId } = {}) => {
      socket.data.userId = userId;
      socket.data.tenantId = tenantId;

      // join rooms for targeted emits
      if (userId) socket.join(`user:${userId}`);
      if (tenantId) socket.join(`tenant:${tenantId}`);
    });

    socket.on('disconnect', () => {
      // no-op for now
    });
  });

  return io;
}

// Safeguard access to io instance
function getIO() {
  if (!io)
    throw new Error(
      'Socket.IO not initialized. Call initSocket(server) first.',
    );
  return io;
}

// Emit helpers
export function emitToUser(userId, event, payload) {
  getIO().to(`user:${userId}`).emit(event, payload);
}

export function emitToTenant(tenantId, event, payload) {
  getIO().to(`tenant:${tenantId}`).emit(event, payload);
}

// For legacy direct send (not using rooms)
export function emitIfConnected(userId, event, payload) {
  const _io = getIO();
  for (const [id, s] of _io.sockets.sockets) {
    if (s.data?.userId === userId) s.emit(event, payload);
  }
}
