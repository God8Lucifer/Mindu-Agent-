# Mobile voice input verification

The guide now uses `guide/gmc-voice.js` for capture and `gmc-guide.js` for chat. Every successful transcript calls the same `ask(question)` as a typed submission. The existing page adapter posts question, history, chamber and audience to `/api/chat` and displays returned source links. The request size limit accommodates all eight history turns without rejecting longer conversations. Browser recognition does not upload audio; its completed transcript follows the same chat path. If recognition is absent, or fails with a service/network error and the visitor retries, MediaRecorder sends the supported encoded format to `/api/transcribe` first.

Each capture owns its recorder, microphone stream, timers, cancellation signal and completion flag. Repeated end/stop events cannot resubmit it. The button finishes recording; speech followed by about 1.4 seconds of silence also finishes it when an active audio analyser is available. The 15-second cap remains a fallback. Audio analysis is best effort: a suspended or unavailable audio context falls back to the button/time limit and transcription validation. Empty clips, detected silence, permission denial, unavailable devices and transcription errors show a short message with retry/type controls. Leaving the page or restarting the kiosk releases capture resources.

The backend rejects clearly unrelated requests with a concise GMC invitation. Ambiguous requests still reach the grounded model. Short follow-ups use bounded conversation history, and the model is instructed to distinguish missing GMC facts from off-topic requests. Demo mode uses curated answers; it cannot generate new detail for follow-ups.

## Automated checks

- `npm test`: 23 unit/lifecycle tests, including history/context/source preservation, unrelated questions, unavailable GMC information, MP4 transcription extension, empty speech, duplicate capture events, an old timer overlapping a new recording, late permission resolution, silence detection, automatic stop after speech, stalled-upload recovery, and full bounded multibyte conversation payloads.
- `npm run build`: production compilation, type checking and prerendering.
- `npm run test:browser`: 12 UI tests, six each in Chromium with Pixel 7 settings and WebKit with iPhone 13 settings. Requires Playwright's Chromium and WebKit downloads (`npx playwright install chromium webkit`). These tests use simulated recognition/recorder/permission events and mocked upstream transcription/AI responses. They exercise the actual page adapter, chat UI and backend reply logic without using a private API key.

The browser checks cover the same question typed and spoken ("What is GMC?"), a spoken "Why?", a spoken unrelated question ("Tell me a joke."), visible transcripts and source links, supported WebM/MP4 selection, one upload and chat per recording, disabled duplicate sends, permission denial, empty recordings, transcription failure, typing recovery, and a runtime recognition failure switching to recorded transcription on retry, plus capture cancellation and reuse after page hide. Integration checks also preserve the upstream GMC branding, theme toggle and explicit microphone opt-out.

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
