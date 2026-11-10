# Mindu — Gelephu Mindfulness City visitor experience

This repo holds two parts of the Mindu project:

- **Mindu guide + GMC AI backend** (`index.html`, `guide/`, `kiosk/`, `backend/`, `serve.js`): the animated GMC-logo guide that answers visitor questions. See "Mindu guide" below.
- **Visitor web app** (`web/`, Next.js): the 3D Experience Centre map, the Mindu chat page, and the photo collection with camera frames. Run it with `cd web && npm install && npm run dev`, then open http://localhost:3000/map (or /photo).

The older dependency-free prototype (`server.js`, `public/`) is described at the end.

---

## Mindu guide

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

---

## Original prototype: personalised GMC visit

A local, dependency-free first slice of the visitor journey:

1. Complete a mock booking with a name, purpose, and interests.
2. Receive a demo ticket code.
3. Enter the code on a portrait-friendly reception screen.
4. Continue on a phone-sized layout. Tap a chamber to set context, chat with a **scripted demo guide**, or leave a question for a human guide.
5. Write a reflection and save or print a personalized Future Postcard.

## Run

Requires Node.js 20 or newer.

```sh
npm run dev
```

Open `http://localhost:3000`. To try the phone layout on another device, open this server on your local network and use the same ticket code. The server binds to all interfaces; use it only on a trusted local network for now.

## Boundaries of this first slice

- Ticketing is simulated. There is no payment or external booking integration.
- The guide uses clearly labelled scripted responses. It is not yet connected to an AI model or approved GMC knowledge base.
- The map is a schematic room selector, not indoor positioning. The visitor selects the chamber.
- QR scanning and handoff are represented by a ticket code and link until the screen camera/scanner setup is confirmed.
- Voice, guide dashboard, and image export are next steps.
- Visit data is stored locally in `data/visits.json`, ignored by Git. This is a prototype data store.

## Suggested next build

Replace `/api/visits/:code/chat` with a server-side AI call grounded in reviewed GMC content. Then add mobile push-to-talk voice and a real ticket QR handoff. Keep the visitor session, room selection, and postcard flow intact.
