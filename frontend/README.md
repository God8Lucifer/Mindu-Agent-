# Mindu frontend (Next.js)

The Next.js + React + TypeScript version of Mindu. So far it contains the
**3D venue map** and the animated Mindu guide. Booking and ticket handoff
still run from the original prototype in `../legacy/prototype/server.js`.

## Run

```sh
npm install
```

Then run `npm run dev` from the repo root (starts this app and the AI backend) and open `http://localhost:3000`.
The Mindu agent is served at `/` from `public/agent/`; the map is at `/map`.

Open `http://localhost:3000/mindu` for the animated voice guide. The map also has
a **Meet Mindu** link and passes the current chamber to the guide.

Mindu has idle, greeting, listening, thinking, talking and celebrating movements.
Visitors can type questions and hear spoken replies; browser speech recognition
adds microphone input where supported. Without `OPENAI_API_KEY`, answers are
clearly labelled demo responses from the GMC challenge brief. Set the key in
an ignored `.env.local` to enable server-side AI responses. `OPENAI_MODEL`
defaults to `gpt-6-luna` and can be changed. The API key stays on the server.

## Map code

- `src/features/map/layout-data.ts` — rooms, walls, route and descriptions, traced
  from the floor-plan image in plan pixels. Edit this to move or rename rooms.
- `src/features/map/geometry.ts` — turns plan pixels into 3D floors and walls.
- `src/features/map/VenueScene.tsx` — the three.js scene (React Three Fiber).
- `src/features/map/VenueMap.tsx` — camera moves, Find/Search panels, place card,
  visited progress and keyboard shortcuts.

Deep link to a place with `/map?place=chamber2`. Visited/"I'm here" progress is
kept in the browser for now; it should move to the visit record when the rest
of the app is ported.
