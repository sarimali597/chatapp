require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

// CLIENT_URL can be a single origin or a comma-separated list of origins,
// e.g. "https://chatapp-frontend.onrender.com,http://localhost:5173"
// Defaults to "*" (allow any origin) so the app still works out of the box locally.
const rawClientUrl = process.env.CLIENT_URL || "*";
const allowedOrigins =
  rawClientUrl === "*" ? "*" : rawClientUrl.split(",").map((origin) => origin.trim());

const app = express();
app.use(cors({ origin: "https://chatapp-ruddy-three.vercel.app" }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://chatapp-ruddy-three.vercel.app",
    methods: ["GET", "POST"],
  },
});

// In-memory map of connected users: socket.id -> username
// (No database yet — fine for a demo chat room, but messages/users reset on restart.)
const onlineUsers = new Map();

function broadcastUserCount() {
  io.emit("user-count", onlineUsers.size);
}

io.on("connection", (socket) => {
  console.log(`client connected: ${socket.id}`);

  socket.on("join", (username) => {
    const safeName = (username || "Anonymous").toString().trim().slice(0, 24) || "Anonymous";
    onlineUsers.set(socket.id, safeName);
    socket.data.username = safeName;

    socket.broadcast.emit("chat-message", {
      id: `sys-${Date.now()}`,
      system: true,
      text: `${safeName} joined the chat`,
      timestamp: Date.now(),
    });

    broadcastUserCount();
  });

  socket.on("chat-message", (text) => {
    if (typeof text !== "string" || !text.trim()) return;

    io.emit("chat-message", {
      id: `${socket.id}-${Date.now()}`,
      senderId: socket.id,
      username: socket.data.username || "Anonymous",
      text: text.trim().slice(0, 1000),
      timestamp: Date.now(),
    });
  });

  socket.on("typing", () => {
    socket.broadcast.emit("typing", socket.data.username || "Someone");
  });

  socket.on("stop-typing", () => {
    socket.broadcast.emit("stop-typing", socket.data.username || "Someone");
  });

  socket.on("disconnect", () => {
    const username = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);

    if (username) {
      io.emit("chat-message", {
        id: `sys-${Date.now()}`,
        system: true,
        text: `${username} left the chat`,
        timestamp: Date.now(),
      });
    }

    broadcastUserCount();
    console.log(`client disconnected: ${socket.id}`);
  });
});

app.get("/", (req, res) => {
  res.send("Chat API is running");
});

// Render (and any host) can hit this to confirm the service is healthy.
app.get("/health", (req, res) => {
  res.json({ status: "ok", onlineUsers: onlineUsers.size });
});

server.listen(PORT, () => {
  console.log(`api is running on port ${PORT}...`);
});
