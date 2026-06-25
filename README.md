# ChatFlow

ChatFlow is a temporary, real-time chat platform. No sign-up, no passwords, no permanent
accounts — pick a username and start talking. It supports public group chat, 1-on-1 private
chats (by request), random user matching, image sharing, typing indicators, read receipts, and
a privacy-respecting admin panel.

Built from scratch with **Node.js / Express / Socket.IO** on the backend and **React / Vite** on
the frontend, with **no database** — everything lives in memory and disappears the moment the
server restarts or a user disconnects.

---

## ⚠️ Before you do anything: about the Cloudinary credentials

The Cloudinary API key/secret used to pre-fill `backend/.env` were shared in plain text in the
chat that generated this project, so treat them as already exposed:

- **Regenerate the API secret** in your [Cloudinary dashboard](https://cloudinary.com/console)
  before relying on this project for anything beyond local testing.
- `backend/.env` is already in `.gitignore` — never commit it.
- When you deploy, set fresh credentials as environment variables on your hosting provider
  rather than reusing the ones in this repo.

---

## Features

- **Temporary usernames** — no auth, no database. A username is reserved only while its socket
  is connected and frees up instantly on disconnect.
- **Group chat** — a single public room for everyone online, with live presence and history for
  newly-joined users.
- **Private 1-on-1 chat** — send a request, the recipient accepts or rejects, and only then is a
  private room created. Messages are only ever delivered to the two participants.
- **Random chat** — "Find Random User" pairs you with another waiting user. Skip to requeue
  instantly, or end the chat entirely.
- **Online users list** — see who's online and fire off a chat request or jump into random
  matching.
- **Image sharing** — JPG/JPEG/PNG/WEBP uploads go straight to Cloudinary; only the resulting
  URL is ever stored (in memory, never on disk/db).
- **Typing indicators** — per-conversation, debounced, auto-clearing.
- **Read receipts** — Sent → Delivered → Seen, for private/random chats only.
- **Live presence** — instant online/offline updates over Socket.IO.
- **Real-time notifications** — new messages, incoming/accepted/rejected requests, random
  matches.
- **Responsive, dark, modern UI** — built around the brief's palette (white / royal blue / jet
  black / ink black / ocean mist), with a signature "live signal" motif instead of generic chat
  bubbles.
- **Admin dashboard** — separate login, live stats, online users, active rooms, mute/restrict
  (10m / 1h / 24h, auto-expiring) and force-disconnect. **The admin panel never has access to
  message content** — only usernames, presence, and room metadata are ever exposed to it.

## Tech stack

**Backend:** Node.js, Express, Socket.IO, Cloudinary, Multer, CORS, dotenv, UUID, Helmet,
Compression, express-rate-limit, jsonwebtoken, xss.

**Frontend:** React, Vite, Socket.IO client, Axios, React Router, Context API, lucide-react
icons, plain modern CSS (no framework) built on CSS variables.

## Project architecture

```
chatflow/
├── backend/
│   ├── server.js                 # Express + Socket.IO bootstrap
│   └── src/
│       ├── config/                # Cloudinary config, app-wide constants
│       ├── middleware/             # rate limiting, error handling, admin auth, multer upload
│       ├── utils/                  # in-memory stores (users, rooms, requests, restrictions,
│       │                            messages), validators, sanitizer, id generator
│       ├── controllers/            # upload + admin REST controllers
│       ├── routes/                 # /api/upload, /api/admin
│       └── socket/
│           ├── index.js            # wires all socket handlers together
│           ├── adminNamespace.js   # authenticated /admin namespace for live dashboard updates
│           └── handlers/           # connection, chat (group), private chat, random chat, typing
└── frontend/
    └── src/
        ├── context/                # Socket, User, Chat, Notification contexts (state via Context API)
        ├── services/                # axios instance + socket.io-client singletons
        ├── hooks/                   # useTyping, useOutsideClick
        ├── utils/                   # validators, constants
        ├── pages/                   # Login, Chat, AdminLogin, AdminDashboard
        ├── components/
        │   ├── layout/               # TopBar, Sidebar
        │   ├── chat/                 # ChatWindow, MessageList, MessageBubble, MessageInput, ...
        │   ├── users/                # UserList
        │   ├── modals/                # RequestModal (incoming chat requests)
        │   ├── notifications/         # NotificationStack (toasts)
        │   ├── admin/                  # StatsCards, UsersTable, RoomsTable, RestrictionModal
        │   └── common/                  # Avatar, Badge, Button, Spinner, SignalMark
        └── styles/                   # variables, global, layout, chat, components, auth, admin
```

### No database, by design

Everything — online users, rooms, pending requests, restrictions, and recent message history —
lives in plain JS `Map`/array structures in `backend/src/utils/*Store.js`. Restarting the server
wipes all state, which is intentional: ChatFlow is meant to be temporary and privacy-first.

### Socket.IO event reference

| Direction | Event | Payload |
|---|---|---|
| C → S | `user:join` | `{ username }` (ack returns `{ success, user, history, onlineUsers }` or `{ success:false, error }`) |
| S → C | `users:update` | `{ users }` |
| C → S | `chat:message` | `{ type: 'text'\|'image', content }` (group chat) |
| S → C | `chat:message` | full message object |
| C → S | `typing` | `{ scope: 'global'\|roomId, isTyping }` |
| S → C | `typing` | `{ username, scope, isTyping }` |
| C → S | `private:request` | `{ to }` |
| S → C | `private:request:incoming` / `:sent` / `:rejected` | request metadata |
| C → S | `private:request:respond` | `{ requestId, accept }` |
| S → C | `room:created` | `{ roomId, type, partner, history }` |
| C → S | `room:message` | `{ roomId, type, content }` |
| S → C | `room:message` | full message object (status: sent/delivered/seen) |
| C → S | `room:focus` | `{ roomId }` — marks messages as seen |
| S → C | `room:seen` | `{ roomId, messageIds }` |
| C → S | `room:leave` | `{ roomId }` |
| S → C | `room:closed` | `{ roomId, reason }` |
| C → S | `random:find` / `random:cancel` / `random:skip` | — / — / `{ roomId }` |
| S → C | `random:waiting` | — |
| S → C | `account:muted` / `account:restricted` / `account:disconnected-by-admin` | — |
| S → C | `action:error` | `{ error }` |

The admin dashboard connects to a separate, JWT-authenticated `/admin` Socket.IO namespace and
receives `admin:snapshot` pushes whenever state changes.

---

## Setup instructions

### Prerequisites

- Node.js 18+
- A Cloudinary account (cloud name, API key, API secret)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in your real values
npm run dev             # nodemon, or: npm start
```

The backend listens on `http://localhost:3000` by default.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # point VITE_API_URL at your backend
npm run dev
```

The frontend runs on `http://localhost:5173` by default (Vite).

### 3. Try it out

- Open two browser windows (or one normal + one incognito) at `http://localhost:5173`.
- Join with two different usernames and chat in the group room, send a private request, or hit
  "Find Random User" in both windows to get matched.
- Visit `http://localhost:5173/admin/login` and sign in with the `ADMIN_USERNAME` /
  `ADMIN_PASSWORD` you set in `backend/.env`.

---

## Environment variables

### `backend/.env`

| Variable | Description |
|---|---|
| `PORT` | Port the Express/Socket.IO server listens on |
| `FRONTEND_URL` | Comma-separated list of allowed CORS origins |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials for image uploads |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin panel login credentials |
| `ADMIN_JWT_SECRET` | Secret used to sign admin session tokens — use a long random string |
| `ADMIN_TOKEN_EXPIRY` | Admin session length (e.g. `12h`) |
| `MAX_FILE_SIZE_MB` | Max image upload size |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS` | General API rate limiting |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend (e.g. `http://localhost:5000` or your Render URL) |

---

## Security notes

- All chat text is sanitized server-side (`xss` package) before broadcast — no HTML/script
  injection.
- Usernames are validated to `^[a-zA-Z0-9_]+$`, 3–20 characters, and enforced unique while
  online.
- Image uploads are restricted to JPG/JPEG/PNG/WEBP and a configurable max size, validated by
  both MIME type and Multer's file filter.
- REST endpoints are rate-limited (general API, uploads, and admin login each have their own
  limits); socket messages are additionally rate-limited per connection to deter flooding.
- The admin REST API and the `/admin` Socket.IO namespace both require a valid JWT issued at
  admin login — there is no shared session with regular users.
- The admin dashboard is intentionally limited to usernames, presence, and room metadata. Message
  content is never stored anywhere the admin API or socket namespace can reach.

---

## Deployment guide

### Backend → Render

1. Push this repo to GitHub (the `backend/` folder can be a separate service, or deploy the
   monorepo and set Render's **root directory** to `backend`).
2. On [Render](https://render.com), create a **New Web Service** from your repo.
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
3. Add the environment variables from `backend/.env.example` under the service's **Environment**
   tab (with your real Cloudinary credentials, a fresh `ADMIN_JWT_SECRET`, etc).
4. Set `FRONTEND_URL` to your deployed Vercel URL (comma-separate multiple origins if needed —
   e.g. local dev + production).
5. Deploy. Render will give you a URL like `https://your-service.onrender.com`.

### Frontend → Vercel

1. On [Vercel](https://vercel.com), import the same repo as a new project.
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
2. Add the environment variable `VITE_API_URL` set to your Render backend URL from above.
3. Deploy. Vercel will give you a URL like `https://your-app.vercel.app`.
4. Go back to Render and make sure `FRONTEND_URL` includes this exact Vercel URL, then redeploy
   the backend so CORS allows it.

### Updating an existing deployment

If you're redeploying on top of existing services, just update the environment variables above
on each platform — no code changes needed for a new domain.

---

## Known limitations (by design)

- **In-memory only:** restarting the backend clears all online users, rooms, requests, and
  history. There is intentionally no database.
- **Single instance:** because state lives in process memory, this won't scale horizontally
  without adding a shared store (e.g. Redis) for presence/rooms and a Socket.IO adapter — out of
  scope for this "temporary chat" brief, but a natural next step if you outgrow it.
- **No message persistence:** that's the point — nothing is ever written to disk or a database.
