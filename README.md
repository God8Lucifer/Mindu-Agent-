# Mindu — Gelephu Mindfulness City visitor experience

## Project structure

```
frontend/                 Next.js app — the whole site, on one port (3000)
  public/agent/           Mindu agent (plain JS): animated GMC-logo guide + chat  → /
    index.html            the agent page; side buttons open the map and the camera
    guide/                the guide (logo animations, chat, voice)
    kiosk/                kiosk flow + map/camera buttons with reveal transition
  src/app/map/            3D Experience Centre map    → /map
  src/app/photo/          photo collection / camera   → /photo
  src/app/mindu/          Mindu chat page (React)      → /mindu
  next.config.ts          serves the agent at /, forwards /api/* to the backend
backend/                  GMC AI backend (Node, OpenAI) — internal, port 3001
scripts/dev.js            compatibility launcher for the integrated Next.js app
assets/logo/              GMC logo exports (SVG + 4096px PNG)
legacy/                   original dependency-free prototype (kept for reference)
```

## Run it

Requires Node.js 22+.

1. Copy `.env.example` to `.env` and add your `OPENAI_API_KEY` (without a key the backend runs in a limited demo mode).
2. First time only: `npm install`
3. From the repo root:

```bash
npm run dev
```

Open **http://localhost:3000**. Everything is on this one address:

| Address | Page |
| --- | --- |
| `/` | Mindu agent |
| `/map` | Experience Centre map |
| `/photo` | Camera / photo collection |
| `/api/*` | AI backend (served directly by Next.js) |

`npm run dev` serves the frontend and AI API in one Next.js process. No `API_URL` or separate backend server is required. `npm run backend` remains available for standalone backend development. Backend tests: `npm test`. Production build: `npm run build`, then `npm start`.

---

## Mindu agent

Mindu is an AI guide for Gelephu Mindfulness City. Instead of a mascot, the guide is the GMC logo itself, animated line by line. Its answers come from the GMC AI backend in `backend/` (OpenAI Responses API, official GMC source notes, gmc.bt web search, voice transcription).

## Logo states

| State | Animation |
| --- | --- |
| `wake` | Lines draw in one by one |
| `idle` | Gentle breathing, light flows down the river |
| `listening` | Frame pulses orange, ripples spread (while typing or using the mic) |
| `thinking` | A spark runs through every line |
| `speaking` | Logo pulses, river flows fast, reply is read aloud |

## Files

- `frontend/public/agent/guide/gmc-guide.js` — the guide (`MinduGuide.mount(element, options)`)
- `frontend/public/agent/guide/gmc-guide.css` — logo animations and chat styles (light and dark)
- `frontend/public/agent/kiosk/` — kiosk flow: splash, intro, QR hand-off, and the side buttons (map, camera)
- `frontend/public/agent/index.html` — the agent page

## How the UI talks to the AI

`frontend/public/agent/index.html` passes two functions to `MinduGuide.mount`:

- `answer(question, history)` → `POST /api/chat` → `{ text, sources }` (sources show as links under the reply)
- `transcribe(blob)` → `POST /api/transcribe` (used for the mic only when the browser has no built-in speech recognition)

The original prototype (booking → ticket → reception → postcard) now lives in [`legacy/prototype/`](legacy/prototype/README.md).

## Vercel deployment

Deploy this repository with Root Directory left at the repository root (`.`), not `frontend` or the local wrapper folder `GMC-Lumi-AI`. The committed `vercel.json` selects Next.js, runs `npm ci` and `npm run build`, and uses `frontend/.next` as output.

Set Node.js to 22.x and add `OPENAI_API_KEY` to the deployment environment for live answers. The backend modules are bundled into the Next.js API function, so no external backend URL is required. The API function requests a 90-second duration; the hosting plan must support it. Platform upload limits still apply to voice recordings.

After merging this branch into `main`, redeploy the latest commit. Verify `/`, `/map`, `/photo`, and `/api/health`. `/api/health` reports `guided-demo` without a key and `live-ai` with a key. Do not put the API key in frontend code or `NEXT_PUBLIC_*` variables.
