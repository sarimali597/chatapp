# ChatApp

A realtime chat app — **React** frontend, **Express + Socket.IO** backend.

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, socket.io-client
- **Backend:** Node.js, Express 5, Socket.IO

## Folder structure

```
chatapp/
├── render.yaml              # Render Blueprint (deploys both services at once)
├── chatapp/
│   ├── backend/              # Express + Socket.IO server
│   │   ├── index.js
│   │   ├── package.json
│   │   └── .env.example
│   └── frontend/              # React + Vite client
│       ├── src/
│       │   ├── App.jsx
│       │   ├── socket.js
│       │   └── components/
│       ├── package.json
│       └── .env.example
```

## Features

- Realtime messaging over WebSockets (Socket.IO)
- Username prompt on join (remembered in `localStorage`)
- Live online-user count
- "X is typing…" indicator
- System messages when someone joins/leaves
- Dark UI styled with the brand palette (royal blue / jet black / ink black / ocean mist)

> Messages and the online-user list live in memory on the server — they reset whenever
> the backend restarts. That's expected for a project at this stage; if you later want
> chat history to persist, swap the in-memory `Map` in `backend/index.js` for a database.

## Running locally

**Backend**

```bash
cd chatapp/backend
cp .env.example .env
npm install
npm run dev        # http://localhost:3000
```

**Frontend** (in a second terminal)

```bash
cd chatapp/frontend
cp .env.example .env
npm install
npm run dev        # http://localhost:5173
```

Open `http://localhost:5173` in two browser tabs and chat between them.

## Environment variables

| Variable          | Where         | Purpose                                                    |
| ------------------ | ------------- | ------------------------------------------------------------ |
| `PORT`             | backend       | Port the server listens on. Render sets this automatically. |
| `CLIENT_URL`       | backend       | Frontend origin(s) allowed by CORS. Comma-separate for multiple. |
| `VITE_SERVER_URL`  | frontend      | URL of the backend the client connects to. Read at **build time**. |

## Deploying to Render

### Option A — Blueprint (one click, recommended)

1. Push this repo to GitHub (it already includes `render.yaml` at the root).
2. In the Render dashboard: **New → Blueprint**, connect your `chatapp` repo, and click **Apply**.
3. Render creates two services — `chatapp-backend` (Web Service) and `chatapp-frontend` (Static Site).
4. Once both have deployed, copy their real `.onrender.com` URLs and update the
   placeholder values in `render.yaml` (`CLIENT_URL` and `VITE_SERVER_URL`), then push again —
   Render will redeploy with the correct URLs wired up. (You only need to do this once,
   since you won't know the URLs until after the first deploy.)

### Option B — Manual setup

**Backend (Web Service)**

1. New → Web Service → connect the repo.
2. Root Directory: `chatapp/backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variable `CLIENT_URL` = your frontend's URL (set after step below).

**Frontend (Static Site)**

1. New → Static Site → connect the same repo.
2. Root Directory: `chatapp/frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. Add environment variable `VITE_SERVER_URL` = your backend's URL from above.

Once both are live, go back and set `CLIENT_URL` on the backend to the frontend's URL
(and redeploy the frontend if you change `VITE_SERVER_URL`, since Vite bakes it in at build time).

> Prefer deploying the frontend on Vercel or Netlify instead? It works the same way —
> just set `VITE_SERVER_URL` as a project environment variable there, pointing at your
> Render backend URL, with Root Directory set to `chatapp/frontend`.

## Color theme

| Token         | Hex       |
| ------------- | --------- |
| `white`       | `#ffffff` |
| `royal-blue`  | `#2563eb` |
| `jet-black`   | `#1f2937` |
| `ink-black`   | `#111827` |
| `ocean-mist`  | `#14b8a6` |

These are wired up as Tailwind utilities in `frontend/src/index.css` (`bg-royal-blue`,
`text-ocean-mist`, etc.) so they're reusable across components.
