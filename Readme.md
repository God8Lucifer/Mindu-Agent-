# Mindu — GMC guide

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
