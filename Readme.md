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

1. `cp .env.example .env` and add your `OPENAI_API_KEY` (without a key, the backend runs in a limited demo mode).
2. Start the backend (port 3001):

```bash
node backend/src/server.js
```

3. Start the UI (port 4321). It forwards `/api/*` to the backend:

```bash
node serve.js
```

Then open http://localhost:4321. Run backend tests with `cd backend && npm test`.

## Logo states

| State | Animation |
| --- | --- |
| `wake` | Lines draw in one by one |
| `idle` | Gentle breathing, light flows down the river |
| `listening` | Frame pulses orange, ripples spread (while typing or using the mic) |
| `thinking` | A spark runs through every line |
| `speaking` | Logo pulses, river flows fast, reply is read aloud |

## Files

- `guide/gmc-guide.js` — the guide (`MinduGuide.mount(element, options)`)
- `guide/gmc-guide.css` — logo animations and chat styles (light and dark)
- `index.html` — demo page

## How the UI talks to the AI

`index.html` passes two functions to `MinduGuide.mount`:

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
