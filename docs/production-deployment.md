# Production update trace — 11 November 2026

## Confirmed evidence

- Canonical repository: `https://github.com/God8Lucifer/Mindu-Agent-`. The configured `TheDragon/Mindu-Agent-` remote redirects there.
- Local source and GitHub `main` matched at `d0aec8ef831482b857188320346a04189605f4b4` before this follow-up fix. The working tree was clean; `.env` remained ignored.
- Current domain supplied by the owner: `https://mindu-agent007.vercel.app`. The previously supplied `005` domain returns Vercel `NOT_FOUND`.
- On `007`, `/` returned 200 with the old "Mindu Guide" title and no voice-controller script. `/briefing` and `/agent/guide/gmc-voice.js` returned 404. The homepage and guide script exactly matched files from `b5e4381` and `6689546`; this fingerprints older source, but does not identify a unique deployment commit.
- Public GitHub records exposed no statuses, check runs or deployment records for `d0aec8e`. This does not prove Vercel never built it: dashboard/CLI deployments may not appear there.
- `/api/health` reported live AI mode. A typed GMC question returned HTTP 200 and a live grounded answer.
- A generated spoken question was recorded with native Chromium MediaRecorder, posted to the production transcription endpoint, and its returned transcript posted through the page's existing `/api/chat` adapter. Both returned HTTP 200, with exactly one transcription upload and one chat request. This used synthetic audio, not a person's microphone. The transcription spelled "Gelephu" as "Jalaphu"; the chat still answered the GMC question.

The update reaches the intended GitHub repository but the production domain serves older source. A wrong connected repository/clone, branch or production assignment is possible; those settings cannot be confirmed without authenticated Vercel access. The deployed commit SHA, unique deployment URL, build logs and exact project configuration have not been verified.

## Code correction

The homepage briefing link had also been removed from current source, independently of the stale deployment. Restore that link and add a browser navigation regression check. The briefing page itself already builds successfully. Repeatedly pushing unchanged commits does not change which Vercel project or deployment serves a domain.

## Required Vercel action

Open the project owning `mindu-agent007.vercel.app`:

1. In **Settings → Git**, verify the connected repository is **God8Lucifer/Mindu-Agent-**, not a template-created copy. If a different repository is connected, reconnect to the canonical repository.
2. In **Settings → Environments → Production → Branch Tracking**, select **main**. Verify production domains are assigned automatically, or promote the verified deployment manually.
3. Keep **Root Directory** at the repository root (`.`). Use the committed `vercel.json`: Next.js, install `npm ci`, build `npm run build`, output `frontend/.next`. The local Mac folder named `GMC-Lumi-AI` is the repository itself, not a subfolder inside the GitHub tree. Use Node.js 22.x. Keep the private API key in the Production environment.
4. In **Deployments**, create a deployment from the latest `main` commit. Redeploying an older deployment rebuilds its old source; it does not select the latest Git commit. Verify the deployment's Source SHA against GitHub `main`. If it fails, inspect the first actionable build error. If Ready, open its unique URL and test `/briefing`, `/agent/guide/gmc-voice.js`, and `/api/health`.
5. Promote the verified deployment to Production if it is not Current. Confirm its domain list includes `mindu-agent007.vercel.app`, then retest those paths on that domain. The homepage should contain "Build my briefing".

Vercel's Git and deployment access is not connected in this workspace. No production alias, repository connection or environment variable was changed during this diagnosis. Connect the Vercel integration to allow these remaining steps to be completed directly. No secrets need to be pasted into chat.

References: [Git deployments and production branch settings](https://vercel.com/docs/git), [promoting a deployment](https://vercel.com/docs/deployments/promoting-a-deployment).

## Subsequent change

The owner requested removal of the briefing feature. The briefing route, homepage link, export dependency, unused link styling and navigation test have been removed. For future deployment verification, test `/`, `/agent/guide/gmc-voice.js` and `/api/health`. A 404 at `/briefing` is now expected; earlier briefing checks above describe the historical diagnosis.
