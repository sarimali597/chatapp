require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const registerSockets = require('./sockets');
const adminAuthRoutes = require('./routes/adminAuth.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();

// Render and most PaaS providers sit behind a reverse proxy — this is
// required for req.ip / express-rate-limit-style logic to see the real
// client IP instead of the proxy's.
app.set('trust proxy', 1);

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong.' });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, credentials: true },
  // Render's free tier can be slow to wake from a cold start — give
  // reconnect attempts more breathing room than the default.
  pingTimeout: 20000,
  pingInterval: 25000,
});

registerSockets(io);

async function start() {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`[server] ChatFlow backend listening on port ${PORT}`);
    console.log(`[server] Accepting frontend origin: ${CLIENT_URL}`);
  });
}

start();

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});
