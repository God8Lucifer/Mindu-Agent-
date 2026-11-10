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
scripts/dev.js            starts backend + frontend together
assets/logo/              GMC logo exports (SVG + 4096px PNG)
legacy/                   original dependency-free prototype (kept for reference)
```

## Run it

Requires Node.js 20+.

1. Copy `.env.example` to `.env` and add your `OPENAI_API_KEY` (without a key the backend runs in a limited demo mode).
2. First time only: `cd frontend && npm install`
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
| `/api/*` | AI backend (forwarded by Next.js; visitors never open port 3001) |

`npm run dev` runs the backend on internal port 3001 (change with `API_PORT`). To run them separately: `npm run backend` and `npm run frontend`. Backend tests: `npm test`.

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
