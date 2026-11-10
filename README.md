# Mindu — Gelephu Mindfulness City visitor experience

## Project structure

```
frontend/
  agent/          Mindu agent UI (vanilla JS): animated GMC-logo guide + chat
    index.html    the agent page; side buttons open the map and the camera
    guide/        the guide (logo animations, chat, voice)
    kiosk/        kiosk flow + map/camera buttons with reveal transition
    serve.js      dev server (port 4321), proxies /api/* to the backend
  web/            Next.js visitor app on port 3000
    src/app/map     3D Experience Centre map   → /map
    src/app/photo   photo collection / camera  → /photo
    src/app/mindu   Mindu chat page            → /mindu
backend/          GMC AI backend (Node, OpenAI) on port 3001
assets/logo/      GMC logo exports (SVG + 4096px PNG)
legacy/           original dependency-free prototype (kept for reference)
```

## Run it

Requires Node.js 20+. Copy `.env.example` to `.env` and add your `OPENAI_API_KEY` (without a key the backend runs in a limited demo mode).

Run each in its own terminal, from the repo root:

```bash
npm run backend   # AI backend   → http://localhost:3001
npm run agent     # agent UI     → http://localhost:4321
npm run web       # map + camera → http://localhost:3000  (first time: cd frontend/web && npm install)
```

The agent's map and camera buttons open `http://localhost:3000/map` and `/photo` (set in `frontend/agent/index.html`). Backend tests: `npm test`.

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

- `frontend/agent/guide/gmc-guide.js` — the guide (`MinduGuide.mount(element, options)`)
- `frontend/agent/guide/gmc-guide.css` — logo animations and chat styles (light and dark)
- `frontend/agent/kiosk/` — kiosk flow: splash, intro, QR hand-off, and the side buttons (map, camera)
- `frontend/agent/index.html` — the agent page

## How the UI talks to the AI

`frontend/agent/index.html` passes two functions to `MinduGuide.mount`:

- `answer(question, history)` → `POST /api/chat` → `{ text, sources }` (sources show as links under the reply)
- `transcribe(blob)` → `POST /api/transcribe` (used for the mic only when the browser has no built-in speech recognition)

The original prototype (booking → ticket → reception → postcard) now lives in [`legacy/prototype/`](legacy/prototype/README.md).
