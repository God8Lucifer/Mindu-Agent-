# Original prototype: personalised GMC visit

A local, dependency-free first slice of the visitor journey:

1. Complete a mock booking with a name, purpose, and interests.
2. Receive a demo ticket code.
3. Enter the code on a portrait-friendly reception screen.
4. Continue on a phone-sized layout. Tap a chamber to set context, chat with a **scripted demo guide**, or leave a question for a human guide.
5. Write a reflection and save or print a personalized Future Postcard.

## Run

Requires Node.js 20 or newer.

```sh
cd legacy/prototype
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
