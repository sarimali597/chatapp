require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { generalLimiter } = require('./src/middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const uploadRoutes = require('./src/routes/uploadRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const initSocket = require('./src/socket');

const app = express();
const server = http.createServer(app);

// Render (and most PaaS providers) sit behind a reverse proxy; trusting the
// first hop lets express-rate-limit see real client IPs instead of the proxy's.
app.set('trust proxy', 1);

const allowedOrigins = (process.env."https://chatapp-ruddy-three.vercel.app" || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
});

// --- Global middleware ---
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

// Make io available to REST controllers (e.g. admin actions need to reach sockets).
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- Routes ---
app.get('/', (req, res) => {
  res.json({ name: 'ChatFlow API', status: 'running', time: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// --- Socket.IO ---
initSocket(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[ChatFlow] Server running on port ${PORT}`);
  console.log(`[ChatFlow] Allowed origins: ${allowedOrigins.join(', ')}`);
});
