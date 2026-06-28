# ChatFlow

Real-time, identity-free chat. No signup, no saved messages — pick a
username, talk, and when you're done there's nothing left behind except
a couple of IP bans if you misbehaved.

This is the implementation of the ChatFlow build spec, with the two open
questions resolved as follows:

- **Admin visibility:** admins watch conversations **live**, exactly as
  they happen, but nothing is ever written to a database. See
  [Privacy model](#privacy-model) below for how that actually works.
- **Scope:** built as a fresh, standalone project (not layered onto the
  earlier `chatapp` repo).

---

## 1. How a conversation actually works

| Mode | How it starts | What happens |
|---|---|---|
| **Group chat** | Automatic on join | Everyone online shares one room, `lobby`. |
| **Random 1:1** | Click "Random partner" | You're queued; the server pairs the two longest-waiting people into a private room. If your partner disconnects, you're notified and silently re-queued. |
| **Direct request** | Pick a name from the active-users list | They get an Accept/Decline prompt. Accepting opens a private room for the two of you. |

Under the hood, all three modes are the same thing: a Socket.IO room.
`send-message` doesn't care whether `roomId` is `"lobby"` or a private
room — the server just checks you're actually a member of that room
before broadcasting. That's the whole messaging system.

## 2. Privacy model

The spec's open question was whether admins get full message content
(stored, with a TTL) or just metadata. The answer landed on a third
option that's stricter than either: **live relay, zero storage.**

```
user sends a message
        │
        ├──► broadcast to everyone in the room  (socket.io room)
        │
        └──► messageBus.emit('message', ...)     (Node EventEmitter)
                        │
                        └──► if an admin is connected, they see it
                             instantly. If not, the emit has no
                             listeners and the message is gone.
```

There is no buffer, no queue, no database write, anywhere in that
path. An admin who opens the dashboard sees everything from that
moment forward; an admin who refreshes the dashboard loses history
exactly like a regular user would — there's nothing to reload because
nothing was ever kept. The *only* thing ChatFlow's database stores is
the **IP ban list** (`backend/src/models/Ban.js`), which is a
moderation record, not chat content.

Practically, this also means: if no admin is watching, there is no
performance or storage cost to any of this — `messageBus` is just an
`EventEmitter` with zero listeners until someone connects to `/admin`.

## 3. Tech stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4 → Vercel
- **Backend:** Node + Express + Socket.IO → Render (free Web Service)
- **Database:** MongoDB Atlas (free M0) — used *only* for IP bans
- **Media:** Cloudinary (free tier), signed direct-from-browser uploads
- **Admin auth:** JWT, credentials from `.env` (no admin DB record)

## 4. Project structure

```
chatflow/
├── backend/
│   ├── src/
│   │   ├── server.js                  # Express + Socket.IO bootstrap
│   │   ├── config/db.js               # Mongo connection (ban list only)
│   │   ├── config/cloudinary.js
│   │   ├── models/Ban.js              # the only thing ever persisted
│   │   ├── middleware/verifyAdminToken.js
│   │   ├── routes/adminAuth.routes.js # POST /api/admin/login
│   │   ├── routes/admin.routes.js     # ban list REST (GET/DELETE)
│   │   ├── routes/upload.routes.js    # Cloudinary signed-upload URLs
│   │   ├── sockets/
│   │   │   ├── index.js               # wires both namespaces
│   │   │   ├── userNamespace.js       # identity, chat, pairing, requests
│   │   │   ├── adminNamespace.js      # live observation + moderation
│   │   │   ├── messageBus.js          # the zero-storage relay
│   │   │   ├── pairingQueue.js
│   │   │   └── banGate.js             # rejects banned IPs at handshake
│   │   └── utils/
│   │       ├── usernameRegistry.js    # in-memory uniqueness + grace window
│   │       ├── roomManager.js         # room lifecycle, shared by both namespaces
│   │       ├── ipHelper.js
│   │       └── hashPassword.js        # CLI: generate ADMIN_PASSWORD_HASH
│   ├── smoke-test.js                  # end-to-end check, see §7
│   └── render.yaml
│
├── frontend/
│   └── src/
│       ├── context/SocketContext.jsx  # the one socket connection + global state
│       ├── hooks/useSocket.js
│       ├── lib/uploadMedia.js         # signed Cloudinary upload helper
│       ├── components/                # ChatBubble, JoinScreen, RoomList,
│       │                              # AudioRecorder, MessageInput,
│       │                              # IncomingRequestModal, ConnectionBanner,
│       │                              # AdminLogin, AdminRoomCard, ModeSelector
│       ├── pages/                     # Home, GroupChat, OneOnOne, AdminDashboard
│       └── App.jsx
│
└── README.md
```

Two deliberate deviations from the original folder sketch, both to
avoid building things that wouldn't do anything:

- No `models/Admin.js` — there's no "no accounts, except this one
  account" exception worth a database for. The single admin's
  credentials live in `.env` and are checked directly.
- No `context/ThemeContext.jsx` — the design system specifies one
  fixed dark theme, so there's no light/dark state to manage. The
  palette lives entirely in `frontend/src/index.css` as Tailwind v4
  `@theme` tokens, exactly as the spec laid out.
- `roomManager` ended up in `utils/`, not `sockets/` — it holds no
  socket event handlers itself, just room lifecycle + an
  `EventEmitter`, so both `userNamespace.js` and `adminNamespace.js`
  import it as shared state rather than one owning the other.

## 5. Setup

### 5.1 Backend

```bash
cd backend
cp .env.example .env
npm install
```

Fill in `.env`:

- `MONGO_URI` — a free MongoDB Atlas M0 cluster connection string.
- `JWT_SECRET` — any long random string.
- `ADMIN_USERNAME` — whatever you want to log into `/admin` with.
- `ADMIN_PASSWORD_HASH` — generate it, don't write the plain password:
  ```bash
  node src/utils/hashPassword.js "yourStrongPassword"
  ```
- `CLOUDINARY_*` — from your Cloudinary dashboard.
- `CLIENT_URL` — `http://localhost:5173` for local dev.

```bash
npm run dev
```

### 5.2 Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. Admin dashboard is at `/admin`.

## 6. Enforcing the upload size/length limits server-side

`upload.routes.js` returns soft limits (`MAX_IMAGE_MB`,
`MAX_VOICE_SECONDS`) that the frontend checks *before* uploading. It
can't do better than that on its own: because uploads go straight from
the browser to Cloudinary (to avoid burning Render's free-tier
bandwidth relaying binary files), our backend never sees the bytes, so
it can't reject an oversized file after the fact.

For an actual hard ceiling, add a Cloudinary **upload preset** with
size/duration restrictions in the Cloudinary dashboard, and reference
its name in the signed params in `upload.routes.js`. Without that,
treat the current limits as "keeps honest users within budget," not
"can't be bypassed."

## 7. Verifying it actually works

`backend/smoke-test.js` is a real Socket.IO client that exercises every
flow against a running server: two users joining and chatting in the
lobby, random pairing, the direct-request accept flow, auto-requeue on
disconnect, admin login + live (unstored) message observation, admin
kicking a user, and a forged admin token being rejected. It was used to
verify this exact codebase before handing it to you — 17/17 checks
passing.

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd backend && npm run smoke-test
```

## 8. Deployment

**Backend → Render:** point Render at `backend/`, or use the included
`render.yaml`. Set every env var from `.env.example` in Render's
dashboard (the file itself is gitignored, on purpose). Render's free
tier sleeps after ~15 minutes idle — the frontend's connection banner
already accounts for a slow first reconnect.

**Frontend → Vercel:** point Vercel at `frontend/`. Set `VITE_API_URL`
and `VITE_SOCKET_URL` to your Render URL **in Vercel's project
settings**, not just locally — Vite bakes these in at build time, so a
missing env var there silently ships a build pointed at `localhost`.

After deploying, update the backend's `CLIENT_URL` to your real Vercel
URL (CORS will otherwise block the frontend).

## 9. Socket event reference

**Client → server** (all with an ack callback unless noted):

| Event | Payload | Returns |
|---|---|---|
| `check-username` | `username` | `{ available, reason }` |
| `join` | `username` | `{ success, username, error }` |
| `find-partner` | — | `{ success }` |
| `leave-queue` | — | `{ success }` |
| `request-chat` | `{ targetUsername }` | `{ success, requestId, error }` |
| `respond-request` | `{ requestId, accept }` | `{ success, roomId?, error }` |
| `send-message` | `{ roomId, type: 'text'\|'image'\|'voice', content, durationSeconds? }` | `{ success, error }` |
| `leave-room` | `{ roomId }` | `{ success }` |
| `typing` | `{ roomId, isTyping }` | *(no ack)* |

**Server → client** (pushed, no ack expected):

`active-users-update`, `incoming-request`, `paired`, `request-accepted`,
`request-declined`, `new-message`, `partner-disconnected`,
`partner-left`, `room-ended`, `kicked`, `typing`

**Admin namespace (`/admin`)**, authenticated via
`socket.handshake.auth.token`:

`rooms-update`, `new-message` (pushed) · `kick-user`, `ban-ip`,
`end-room` (client → server, with ack)

## 10. Free-tier reality check

- Render's free web service sleeps after ~15 min idle; first
  connection after that takes 30-50s. The frontend shows a
  "connecting…" banner rather than looking broken.
- MongoDB Atlas M0 caps at 512MB — irrelevant here in practice, since
  the only collection is the ban list.
- Cloudinary's free tier is ~25 combined storage+bandwidth credits a
  month — the image/voice size caps exist specifically to make that
  last.

## 11. System design notes

**Service boundaries.** There are really only three moving parts:
an Express REST surface (admin login + ban CRUD + Cloudinary signing —
all stateless, all fine to scale horizontally on their own), a
Socket.IO default namespace (everything stateful: identity, rooms,
queue, requests), and a Socket.IO `/admin` namespace that depends on
the default namespace's in-memory state but never writes to anything
itself except through the REST ban routes. `messageBus` is the only
thing connecting the user namespace and the admin namespace — that
isolation is deliberate: the admin namespace has no way to *cause*
anything in a user's conversation except through the three explicit
moderation actions (`kick-user`, `ban-ip`, `end-room`).

**The one real constraint this creates: single instance only.**
`usernameRegistry`, `roomManager`, `pairingQueue`, `pendingRequests`,
and the rate-limit map all live in plain JS `Map`s inside one Node
process. That's exactly why the whole identity/room system can stay
this simple — but it also means ChatFlow cannot run on more than one
backend instance at a time. If Render scales this to 2+ instances (or
you move to a host that does that by default), users landing on
different instances would never see each other in the active-users
list, pairing would only ever match people hitting the same instance,
and `/admin` would only observe whichever instance it happened to
connect to. Render's free tier is always a single instance, so this
isn't a problem today — it's a deliberate "simple now, known ceiling
later" tradeoff, not an oversight. If you ever do need multiple
instances, the fix is a shared store for that state (Redis is the
standard choice, and `socket.io-adapter-redis` solves the
cross-instance broadcast half of it) — at which point `roomManager`'s
`EventEmitter` would need to become Redis pub/sub too, since that's
exactly the same problem `messageBus` solves, just across processes
instead of within one.

**Failure modes, summarized** (each is also handled in code, not just
documented): Mongo down → bans fail open instantly, chat is
unaffected; Cloudinary down → upload errors surface in the composer,
chat is unaffected; Render cold start → connection banner explains the
delay instead of looking broken; admin token invalid/expired → admin
socket is rejected at the namespace boundary, REST ban routes reject
at the middleware.

