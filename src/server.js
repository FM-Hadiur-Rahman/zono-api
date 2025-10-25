// import "dotenv/config";
// import app from "./app.js";
// import { lowStockCron } from "./utils/lowStockCron.js";
// import { prisma } from "./services/prisma.js";

// const port = process.env.PORT || 4000;

// const server = app.listen(port, () => {
//   console.log(`Zono API listening on :${port}`);
//   // Start background/scheduled jobs ONLY in the server process (not in tests)
//   lowStockCron();
// });

// // Graceful shutdown
// const shutdown = async (code = 0) => {
//   try {
//     console.log("Shutting down...");
//     await prisma.$disconnect();
//     server.close(() => process.exit(code));
//   } catch (err) {
//     console.error(err);
//     process.exit(1);
//   }
// };

// process.on("SIGINT", () => shutdown(0));
// process.on("SIGTERM", () => shutdown(0));

import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { prisma } from './services/prisma.js';
import { lowStockCron } from './utils/lowStockCron.js';
import { initSocket } from './realtime/socket.js'; // 👈 new import

const port = process.env.PORT || 4000;

// 1️⃣ Create HTTP server explicitly (required for Socket.IO)
const server = http.createServer(app);

// 2️⃣ Initialize WebSocket layer
initSocket(server);

// 3️⃣ Start your background jobs & HTTP listener
server.listen(port, () => {
  console.log(`Zono API listening on :${port}`);
  lowStockCron();
});

// 4️⃣ Graceful shutdown
const shutdown = async (code = 0) => {
  try {
    console.log('Shutting down...');
    await prisma.$disconnect();
    server.close(() => process.exit(code));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
