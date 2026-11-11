# GMC feature audit — 11 November 2026

## Result

The app is not yet verified across all physical-phone features. The main camera
failure on the QR phone link is the HTTP LAN origin: browsers require a secure
context for the live camera and microphone. A native photo capture/file input
fallback is now available. A real phone must still verify its native camera UI.

## Fixes made

- Added a “Take a photo” input with the device-camera capture hint, separate from
  the gallery/upload input. The shutter uses it when live preview is unavailable.
- Added camera permission, insecure-origin, busy-camera and image-processing
  messages, plus retry and fallback controls while awaiting permission.
- Await video playback and keep preview rendering until video dimensions arrive.
- Explain why voice input cannot run on the HTTP phone link; report denied
  microphone permission and speech-recognition failures.
- Allow this computer's active network addresses as Next.js development origins.
- Route the briefing link through chat preservation and return to phone chat.

## Evidence and remaining checks

| Feature | Status | Evidence / remaining work |
| --- | --- | --- |
| QR to phone chat | Previously browser verified | Real QR opens shared GMC chat, orange pairing waits for kiosk, kiosk resets. No new physical-phone scan in this audit. |
| Typed GMC chat | Previously browser verified; backend tests pass | Shared `/api/chat`; prior phone browser check received a real answer. |
| Voice input | Blocked on HTTP phone link | Requires HTTPS and permission. New explanatory message is compiled but not interactively retested. |
| Spoken replies | Not fully verified | Speech synthesis state was observed previously; audible output was not checked. |
| Live camera / flip / countdown | Blocked on HTTP phone link | Desktop camera request remained awaiting permission. Physical capture, camera switching and countdown still need hardware testing. |
| Native camera input | Browser pipeline passed with fixture | “Take a photo” opens a chooser; a supplied local sample image rendered and could be kept. Physical phone camera UI is not verified. |
| Gallery/upload | Passed with fixture | Two further sample image selections completed a chamber. No visitor photos were used. |
| Frames | Partially verified | Classic and Polaroid selected/rendered. Remaining four styles not individually exercised. |
| Photo retention | Passed | Three photos were kept; a reload restored all three from device storage. |
| Retake | Not fully verified | Controls rendered; replacing an individual stored shot was not completed. |
| Save chamber | Passed | Browser downloaded `gmc-chamber-2-urban-blueprint.jpg`. |
| Build collection | Passed | Result view displayed the generated GMC photo collection. |
| Save collection / share | Blocked during verification | Browser download approval was declined. Native share sheet and save fallback not verified. |
| Map | Partially verified | 3D map loaded; The Vision selected; “I'm here” opened the butter-lamp hologram. Lamp completion, other chambers, search and view controls need further interactive checks. |
| Theme | Not interactively verified in this audit | Theme styles and controls reviewed; toggle/persistence require browser verification. |
| Briefing / PowerPoint | Build and source review only | Return-to-phone-chat path fixed. Selection, download and chat restoration still need interactive verification. |
| AI photo cover | Placeholder | `generateAiCover` returns null; the built-in template cover is used. |
| Map AI Assistant / Postcard Board | Informational places | Current place cards describe these stations; they do not implement a separate question form or postcard submission. |

## Code checks

- `npm test`: all 12 backend tests passed.
- TypeScript check passed.
- ESLint passed for the changed React pages, photo component and Next.js config.
- JavaScript syntax checks and `git diff --check` passed.
- Production build passed for all routes, including photo, map and briefing.

## Verification boundary

Browser approval first declined the collection download, then declined further
access to `http://10.9.94.216:3000`. No alternative browser or download method was
used to bypass that decision. Remaining interactive checks require browser access
to be allowed again. Live camera/mic testing on the phone also requires a trusted
HTTPS address; merely allowing camera permission on the HTTP LAN address will
not enable live media access.
