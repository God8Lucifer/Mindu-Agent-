# Mobile voice input verification

## Combined branch verification

After merging `main` into `bug-fixes-ui`, 27 backend/lifecycle tests passed, the production build and targeted UI lint passed, and 33 browser tests passed. One native generated-audio test was skipped because this Windows WebKit runtime does not expose native recording support; its simulated capture checks passed. Native Chromium encoding passed. Physical iPhone Safari and Android Chrome recording remain unverified.

The UI keeps the microphone entry visible unless explicitly disabled. Insecure phone pages show the HTTPS explanation up front; tapping the microphone repeats the secure-connection requirement and offers typing recovery without starting capture. Both restored source links and the QR handoff animation fixes are covered by the combined browser suite.

## Reverification on 11 November 2026

The merged `main` already contained the shared voice/chat pipeline and polite
off-topic handling. This pass added an explicit HTTPS message before capture on
an insecure phone origin, and kept the microphone recovery UI available when a
browser has no capture APIs. Explicit microphone opt-out still hides the button.

All 25 backend/lifecycle tests, all 18 browser checks, and the production build
passed. The browser checks comprise nine Android/Chromium and nine iPhone/WebKit
emulated checks. Three new checks per browser exercise real `/api/chat` requests
for the typed/spoken GMC question, spoken follow-up and unrelated request; a real
`/api/transcribe` error response; and recovery without capture APIs. Successful
transcription is simulated for these checks. Existing tests separately verify
source-link rendering and grounded AI request context with mocked upstream AI.
No physical microphone, Safari app, Android Chrome app, or live AI/transcription
service was tested in this pass. Earlier production checks below are historical.

The guide now uses `guide/gmc-voice.js` for capture and `gmc-guide.js` for chat. Every successful transcript calls the same `ask(question)` as a typed submission. The existing page adapter posts question, history, chamber and audience to `/api/chat` and displays returned source links. The request size limit accommodates all eight history turns without rejecting longer conversations. Browser recognition does not upload audio; its completed transcript follows the same chat path. If recognition is absent, or fails with a service/network error and the visitor retries, MediaRecorder sends the supported encoded format to `/api/transcribe` first.

Each capture owns its recorder, microphone stream, timers, cancellation signal and completion flag. Repeated end/stop events cannot resubmit it. The button finishes recording; speech followed by about 1.4 seconds of silence also finishes it when an active audio analyser is available. The 15-second cap remains a fallback. Audio analysis is best effort: a suspended or unavailable audio context falls back to the button/time limit and transcription validation. Empty clips, detected silence, permission denial, unavailable devices and transcription errors show a short message with retry/type controls. Leaving the page or restarting the kiosk releases capture resources.

The backend rejects clearly unrelated requests with a concise GMC invitation. Ambiguous requests still reach the grounded model. Short follow-ups use bounded conversation history, and the model is instructed to distinguish missing GMC facts from off-topic requests. Demo mode uses curated answers; it cannot generate new detail for follow-ups.

## Automated checks

- `npm test`: 27 unit/lifecycle tests, including history/context/source preservation, chained follow-ups, unrelated questions, unavailable GMC information, insecure phone origins, MP4 transcription extension, empty speech, duplicate capture events, an old timer overlapping a new recording, late permission resolution, silence detection, automatic stop after speech, stalled-upload recovery, and full bounded multibyte conversation payloads.
- `npm run build`: production compilation, type checking and prerendering.
- `npm run test:browser`: combined voice and QR handoff checks in Chromium with Pixel 7 settings and WebKit with iPhone 13 settings. Requires Playwright's Chromium and WebKit downloads (`npx playwright install chromium webkit`). Most tests use simulated recognition/permission events and mocked upstream transcription/AI responses. Two tests use the browser’s native MediaRecorder with a generated Web Audio stream; they verify real encoding without physical microphone hardware. Tests cover real local API routes as well as mocked upstream responses, without a private API key.

The browser checks cover the same question typed and spoken ("What is GMC?"), spoken "Why?" and "Tell me more." follow-ups, a spoken unrelated question ("Tell me a joke."), visible transcripts and source links, supported WebM/MP4 selection, one upload and chat per recording, disabled duplicate sends, permission denial, empty recordings, transcription failure, typing recovery, and a runtime recognition failure switching to recorded transcription on retry, plus capture cancellation and reuse after page hide. Integration checks also preserve the upstream GMC branding, theme toggle and explicit microphone opt-out.

## Physical device checks still required

Use the HTTPS deployment on current iPhone Safari and Android Chrome. No physical devices were available during implementation.

1. Allow microphone access. Ask "What is GMC?" by typing and speaking. Confirm the transcript is visible once, each recording sends one chat request, and source links open correctly.
2. Say "Why?" and "Tell me more." Confirm the reply continues the GMC discussion. Say "Tell me a joke." Confirm the brief GMC invitation. Ask an unavailable GMC fact and confirm the answer says it cannot confirm the information.
3. Check listening, transcribing, and preparing-a-reply indicators. Test both automatic silence stop and the finish button, rapid taps and a second recording. Confirm playback from Mindu does not enter a recording.
4. Deny permission, restore it in browser settings, then retry. Record silence, speak quietly, and try a noisy venue. Check that silence detection does not cut off quiet speech. Retry and type instead must remain usable.
5. Test an interrupted network, backgrounding/locking the phone and returning, and restarting the kiosk during capture. Confirm the microphone indicator turns off and late callbacks never send another question.
6. Test real MP4/WebM audio through `/api/transcribe` with the deployment's private API key. Emulation does not verify actual mobile codecs, microphone hardware, OS permission dialogs, native speech services, recognition accuracy or live model grounding.

Implementation references: [MediaRecorder completion event](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop_event), [supported recording formats](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static), and [recognition errors](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/error_event).

A synthetic-audio check on the existing production domain also passed native Chromium recording → `/api/transcribe` → `/api/chat` with one upload and one chat request. See `production-deployment.md` for the source/deployment mismatch and remaining Vercel actions. Physical phone checks remain required.

## Outer Mindu-Agent- verification update

The follow-up changes were made in the outer repository (`Mindu-Agent-`), not the nested `GMC-Lumi-AI` copy:

- Unlock AudioContext from the microphone tap before awaiting permission, and release it and the microphone before transcription upload. Permission cancellation and late callbacks remain guarded per recording.
- Show a short HTTPS/type message on insecure mobile connections instead of silently hiding voice input. A phone opening a local LAN HTTP URL cannot use browser microphone capture; test the HTTPS deployment for real mobile recording.
- Preserve source links when a saved conversation is restored, while sending only role/content history to `/api/chat`.
- Keep concise off-topic invitations and grounded follow-ups. In demo mode, requests for unavailable specific facts (such as salaries or business licence costs) explicitly say the information cannot be confirmed rather than returning generic matching topic notes.

Verified on Node.js 22: 25 unit/lifecycle tests, the production build, and 20 browser tests (10 Chromium/Pixel 7 emulation and 10 WebKit/iPhone 13 emulation). The spoken/typed comparison, follow-ups, off-topic case, permission denial, silence, transcription failure, duplicate callbacks, restored citations and native generated-audio encoding passed. Upstream transcription/AI responses in these browser tests were mocked; no fresh physical-phone or live-service checks are claimed by this update. The earlier synthetic production check above is historical evidence for the prior deployment, not a verification of these new changes on production.

Still required on physical iPhone Safari and Android Chrome: OS microphone permissions, real spoken transcription accuracy, quiet/noisy rooms, automatic silence stop, interruption/background recovery and live AI grounding/source links on the HTTPS deployment. Use the checklist above.

References: [microphone secure-context requirement](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [Web Audio interaction requirements](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).
