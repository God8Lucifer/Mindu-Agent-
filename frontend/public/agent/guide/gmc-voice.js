/* One capture at a time. Browser APIs are injected for deterministic lifecycle tests. */
(function (global) {
  function createVoiceInput({ env = global, transcribe, onState, onTranscript, onError }) {
    const secure = env.isSecureContext !== false;
    const Recognition = secure && (env.SpeechRecognition || env.webkitSpeechRecognition);
    const canRecord = !!(secure && transcribe && env.navigator?.mediaDevices?.getUserMedia && env.MediaRecorder);
    let useRecorder = !Recognition;
    let current = null;
    let destroyed = false;
    const alive = session => !destroyed && current === session && !session.finished;
    function releaseMicrophone(session) {
      clearInterval(session.meter);
      const context = session.audioContext;
      session.audioContext = null;
      try { context?.close().catch(() => {}); } catch {}
      session.stream?.getTracks().forEach(track => track.stop());
      session.stream = null;
    }
    function release(session) {
      clearTimeout(session.timer);
      clearTimeout(session.deadline);
      session.abort?.abort();
      releaseMicrophone(session);
    }
    function finish(session, text, message) {
      if (!alive(session)) return;
      session.finished = true;
      release(session);
      current = null;
      onState('idle');
      if (message) onError(message);
      else if (text?.trim()) onTranscript(text.trim());
      else onError("I didn’t hear any speech. Try again or type your question.");
    }
    function fail(session, message) {
      finish(session, null, message);
      // Invalidate first: abort/stop can synchronously fire another callback.
      try { session.recognition?.abort(); } catch {}
      try { if (session.recorder?.state === 'recording') session.recorder.stop(); } catch {}
    }
    function stop() {
      const session = current;
      if (!session || session.stopping) return;
      session.stopping = true;
      clearTimeout(session.timer);
      if (!session.recognition && !session.recorder) {
        return finish(session, null, 'Recording cancelled. Try again or type your question.');
      }
      onState('transcribing');
      try {
        if (session.recognition) session.recognition.stop();
        else if (session.recorder.state === 'recording') session.recorder.stop();
      } catch { fail(session, 'Recording stopped unexpectedly. Try again or type your question.'); }
    }
    async function start() {
      if (destroyed || current) return;
      if (env.isSecureContext === false) {
        onState('idle');
        onError('Voice input needs a secure HTTPS connection. Open the secure site, then retry or type your question.');
        return;
      }
      const session = { finished: false, stopping: false, abort: new AbortController() };
      current = session;
      onState('requesting');
      // Covers a permission prompt, lost browser callbacks, and a stalled upload.
      session.deadline = setTimeout(() => fail(session, 'Voice input timed out. Try again or type your question.'), 45000);
      if (Recognition && !useRecorder) {
        try {
          const recognition = session.recognition = new Recognition();
          recognition.lang = 'en-US';
          recognition.continuous = false;
          recognition.interimResults = true;
          let transcript = '';
          recognition.onstart = () => {
            if (alive(session)) onState('listening');
          };
          recognition.onresult = event => {
            if (!alive(session)) return;
            transcript = Array.from(event.results).map(result => result[0]?.transcript || '').join(' ').trim();
          };
          recognition.onspeechend = () => { if (alive(session)) stop(); };
          recognition.onend = () => finish(session, transcript);
          recognition.onerror = event => {
            if (!alive(session)) return;
            if (canRecord && ['network', 'service-not-allowed', 'language-not-supported'].includes(event.error)) useRecorder = true;
            const message = ['not-allowed', 'service-not-allowed'].includes(event.error)
              ? 'Microphone access was denied. Allow it in browser settings, then retry or type your question.'
              : event.error === 'no-speech'
                ? 'I didn’t hear any speech. Try again or type your question.'
                : 'Voice recognition is unavailable. Try again or type your question.';
            fail(session, message);
          };
          recognition.start();
          session.timer = setTimeout(() => alive(session) && stop(), 15000);
        } catch {
          if (canRecord) useRecorder = true;
          fail(session, 'Voice recognition could not start. Try again or type your question.');
        }
        return;
      }
      if (!canRecord) return fail(session, secure
        ? 'Voice input is unavailable in this browser. Please type your question.'
        : 'Open the secure HTTPS version to use the microphone, or type your question.');
      // Unlock audio synchronously from the microphone tap, before the permission
      // promise settles. Mobile browsers may drop user activation after await.
      try {
        const AudioContext = env.AudioContext || env.webkitAudioContext;
        if (AudioContext) {
          session.audioContext = new AudioContext();
          session.audioContext.resume().catch(() => {});
        }
      } catch { /* Recording still works without silence analysis. */ }
      try {
        const stream = await env.navigator.mediaDevices.getUserMedia({ audio: true });
        if (!alive(session)) { stream.getTracks().forEach(track => track.stop()); return; }
        session.stream = stream;
        const formats = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
        const mimeType = formats.find(type => env.MediaRecorder.isTypeSupported?.(type));
        // Best-effort silence detection. Suspended/unavailable audio contexts do
        // not block recording; the transcription service remains the fallback.
        try {
          const context = session.audioContext;
          if (context) {
            const analyser = context.createAnalyser();
            analyser.fftSize = 512;
            context.createMediaStreamSource(stream).connect(analyser);
            const samples = new Uint8Array(analyser.fftSize);
            session.samples = 0;
            session.sound = false;
            let quietFrames = 0;
            session.meter = setInterval(() => {
              if (context.state !== 'running') return;
              analyser.getByteTimeDomainData(samples);
              session.samples++;
              const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
              if (rms > 0.006) { session.sound = true; quietFrames = 0; }
              else quietFrames++;
              // Finish after speech followed by about 1.4 seconds of silence.
              // The microphone button and 15-second cap remain fallbacks.
              if (session.sound && quietFrames >= 28 && alive(session)) stop();
            }, 50);
          }
        } catch { /* Some mobile browsers do not expose an audio analyser. */ }
        const recorder = session.recorder = new env.MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        const chunks = [];
        let uploaded = false;
        recorder.ondataavailable = event => { if (alive(session) && event.data.size) chunks.push(event.data); };
        recorder.onerror = () => fail(session, 'Recording failed. Try again or type your question.');
        recorder.onstop = async () => {
          if (!alive(session) || uploaded) return;
          uploaded = true;
          clearTimeout(session.timer);
          releaseMicrophone(session);
          if (session.samples >= 5 && !session.sound) return finish(session, null, 'I didn’t hear any speech. Try again or type your question.');
          onState('transcribing');
          const blob = new env.Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || mimeType || '' });
          if (blob.size < 1000) return finish(session, null, 'I didn’t hear enough speech. Try again or type your question.');
          if (blob.size > 4 * 1024 * 1024) return finish(session, null, 'That recording is too large. Try a shorter question or type it.');
          try { finish(session, await transcribe(blob, { signal: session.abort.signal })); }
          catch { finish(session, null, 'I couldn’t transcribe that. Try again or type your question.'); }
        };
        recorder.start();
        onState('listening');
        session.timer = setTimeout(() => alive(session) && stop(), 15000);
      } catch (error) {
        fail(session, error.name === 'NotAllowedError' || error.name === 'SecurityError'
          ? 'Microphone access was denied. Allow it in browser settings, then retry or type your question.'
          : 'The microphone is unavailable. Try again or type your question.');
      }
    }
    function cancel() {
      if (!current) return;
      const session = current;
      session.finished = true;
      current = null;
      release(session);
      try { session.recognition?.abort(); } catch {}
      try { if (session.recorder?.state === 'recording') session.recorder.stop(); } catch {}
      onState('idle');
    }
    return {
      start, stop, cancel,
      destroy() { cancel(); destroyed = true; },
      get active() { return !!current; },
      supported: !!Recognition || canRecord,
      availabilityMessage: !secure
        ? 'Open the secure HTTPS version to use the microphone, or type your question.'
        : !Recognition && !canRecord ? 'Voice input isn’t available in this browser. You can type your question.' : '',

    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createVoiceInput };
  else global.MinduVoice = { createVoiceInput };
})(typeof window === 'undefined' ? globalThis : window);
