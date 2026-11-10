# Mindu — GMC guide

Mindu is an AI guide for Gelephu Mindfulness City. Instead of a mascot, the guide is the GMC logo itself, animated line by line.

## Run it

Mindu's answers come from the GMC AI backend in `backend/` (from the GMC Knowledge Upgrade project: OpenAI Responses API, official GMC source notes, gmc.bt web search, voice transcription).

1. Use Node.js 22 or newer and run `cp .env.example .env`.
2. Add your `OPENAI_API_KEY` to `.env` for live answers, or leave it empty for demo mode.
3. Run `npm start` from this directory and open http://localhost:4321.

The UI and API run in one process. If the default port 4321 is occupied, startup tries ports 4322–4331 and prints the available URL. Use `PORT=5000 npm start` to select a different port. `node serve.js` remains a compatibility command. `PORT` overrides the default port; the example environment uses port 4321. Run `npm test` for API and integration checks and `npm run build` to prepare public assets in `dist/`.

## Structure and deployment

- `server.cjs`: shared HTTP handler and local startup; no runtime directory creation.
- `api/index.cjs`: serverless entry point, importing the shared handler without opening a port.
- `backend/src/`: API routes, AI integration, transcription, and curated content.
- `backend/test/`: unit and HTTP integration tests.
- `frontend/`: main page, guide UI, kiosk flow, and exported assets.
- `scripts/build.cjs`: copies only public assets into `dist/`.

For Vercel, select `GMC-Lumi-AI` as the project root and use the included `vercel.json`. Set the API key in hosting environment variables and redeploy. The API timeout is configured for 90 seconds; ensure your hosting plan supports this duration. No persistent local storage is required. Do not deploy the old generated server that creates `/var/task/data`; deploy this source and its entry point instead.

The venue-map button stays hidden until `mapUrl` in `frontend/index.html` points to an available map. The map application is not included in this repository.

## Logo states

| State | Animation |
| --- | --- |
| `wake` | Lines draw in one by one |
| `idle` | Gentle breathing, light flows down the river |
| `listening` | Frame pulses orange, ripples spread (while typing or using the mic) |
| `thinking` | A spark runs through every line |
| `speaking` | Logo pulses, river flows fast, reply is read aloud |

## Files

- `frontend/guide/gmc-guide.js` — the guide (`MinduGuide.mount(element, options)`)
- `frontend/guide/gmc-guide.css` — logo animations and chat styles (light and dark)
- `frontend/index.html` — demo page

## How the UI talks to the AI

`frontend/index.html` passes two functions to `MinduGuide.mount`:

- `answer(question, history)` → `POST /api/chat` → `{ text, sources }` (sources show as links under the reply)
- `transcribe(blob)` → `POST /api/transcribe` (used for the mic only when the browser has no built-in speech recognition)
