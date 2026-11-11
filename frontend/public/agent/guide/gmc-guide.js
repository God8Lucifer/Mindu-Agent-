/*
 * Mindu guide — the GMC logo as an animated AI guide.
 *
 * Usage:
 *   const guide = MinduGuide.mount(element, { answer: async (question) => 'reply text' });
 *
 * The logo has five states: 'wake' | 'idle' | 'listening' | 'thinking' | 'speaking'.
 * `answer(question, history)` returns the reply: a string, or { text, sources: [{ title, url }] }.
 * `transcribe(blob)` (optional) turns recorded audio into text when the browser has no speech recognition.
 * `mic: false` hides the microphone button (typed questions only).
 * Without `answer`, scripted replies are used.
 */
(function () {
  const FRAME = [
    'M443.673 443.21V5.30865H5.32678V443.522L443.673 443.21Z',
    'M224.523 5.31317L5.35114 224.255L224.527 443.202L443.699 224.26L224.523 5.31317Z',
  ];
  const LINES = [
    'M269.116 124.981L234.366 159.695', 'M306.716 87.4208L289.451 104.674',
    'M169.73 224.263L114.936 169.526', 'M114.943 114.782L224.517 224.263',
    'M241.615 131.849L169.73 60.0455', 'M296.41 186.592L261.964 152.176',
    'M334.12 224.263L316.689 206.85', 'M169.73 60.0455H239.204',
    'M60.1418 169.519H209.831', 'M267.793 71.5662L225.633 113.682',
    'M416.297 196.888L398.998 214.169', 'M241.574 186.544L169.737 114.782',
    'M279.318 224.256L261.895 206.85', 'M114.936 224.256L60.1418 169.519',
    'M5.37531 5.30865L114.943 114.782', 'M377.339 181.068L344.224 214.155',
    'M114.936 224.256L114.95 5.30865', 'M296.41 131.849L261.964 97.4391',
    'M351.162 186.544L316.71 152.134', 'M388.907 224.256L371.462 206.83',
    'M269.13 179.704L224.524 224.256', 'M322.587 126.296L289.451 159.404',
    'M443.694 5.30865L334.113 114.789', 'M224.517 114.789L5.35449 114.775',
    'M323.862 179.752L289.451 214.134', 'M361.503 142.151L344.224 159.418',
    'M114.936 333.737V443.21', 'M334.113 443.21V333.737H443.694L334.113 443.21Z',
    'M114.936 333.737H5.34756', 'M334.106 333.737H224.517',
    'M279.312 224.256V388.474', 'M334.106 224.256V333.737', 'M388.9 224.256V279',
    'M443.694 224.256L5.35449 224.263', 'M183.765 333.737H224.497',
    'M114.908 333.737H155.224', 'M114.908 239.598V333.737', 'M169.709 293.255V388.474',
    'M169.709 60.0386V264.744', 'M169.709 388.474H279.284', 'M60.114 279V169.533',
    'M129.185 278.993L388.879 279', 'M60.1209 278.993H100.645',
  ];
  const RIVER =
    'M224.51 5.30865C244.097 41.8022 244.097 78.2888 224.51 114.782C204.931 151.276 204.931 187.769 224.51 224.256H224.497C244.083 260.75 244.083 297.236 224.497 333.73C204.917 370.223 204.917 406.717 224.497 443.203';

  // Placeholder replies until the real AI is connected (teammate's part).
  const SCRIPTED = [
    { match: /^(hi|hello|hey|kuzu)/i, reply: "Kuzuzangpo la! I'm your GMC guide to Gelephu Mindfulness City. What would you like to explore?" },
    { match: /where|map|go|visit|place/i, reply: 'I can point you around the city. Ask me about a place, and I will show you the way.' },
    { match: /what is|about|gmc|gelephu/i, reply: 'Gelephu Mindfulness City is a new city in southern Bhutan, built around mindfulness, nature and sustainable growth.' },
    { match: /who are you|your name/i, reply: "I'm the GMC guide. The lines you see are the city's logo — I light up when I listen, think and speak." },
  ];
  const FALLBACK = "That's a good question. My full answers are coming soon — for now, try asking what GMC is or where to go.";

  async function scriptedAnswer(q) {
    const hit = SCRIPTED.find((s) => s.match.test(q.trim()));
    return hit ? hit.reply : FALLBACK;
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function logoSvg() {
    const path = (d, cls, i) => `<path d="${d}" pathLength="1" class="${cls}" style="--i:${i}"/>`;
    let i = 0;
    return `<svg class="mg-logo" viewBox="0 0 449 449" aria-hidden="true">
      ${FRAME.map((d) => path(d, 'mg-frame', i++)).join('')}
      ${LINES.map((d) => path(d, '', i++)).join('')}
      ${path(RIVER, 'mg-river', i++)}
    </svg>`;
  }

  function mount(root, opts = {}) {
    const answer = opts.answer || scriptedAnswer;
    const voice = opts.voice !== false && 'speechSynthesis' in window;
    const micOn = opts.mic !== false;
    const Recognition = micOn ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
    const canRecord = micOn && !Recognition && opts.transcribe && navigator.mediaDevices && window.MediaRecorder;
    const history = []; // { role: 'user' | 'assistant', content }

    root.classList.add('mg');
    root.innerHTML = `
      <div class="mg-stage" data-state="wake">
        <span class="mg-ring"></span><span class="mg-ring"></span><span class="mg-ring"></span>
        ${logoSvg()}
      </div>
      <p class="mg-name">GMC <span>· your guide</span></p>
      <p class="mg-status" aria-live="polite"></p>
      <div class="mg-log" role="log" aria-live="polite"></div>
      <div class="mg-chips"></div>
      <form class="mg-input">
        <button type="button" class="mg-mic" aria-label="Speak to GMC" ${Recognition || canRecord ? '' : 'hidden'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
        </button>
        <input type="text" placeholder="Ask GMC anything…" aria-label="Your question" autocomplete="off" />
        <button type="submit" class="mg-send" aria-label="Send">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
        </button>
      </form>`;

    const stage = root.querySelector('.mg-stage');
    const status = root.querySelector('.mg-status');
    const log = root.querySelector('.mg-log');
    const chips = root.querySelector('.mg-chips');
    const form = root.querySelector('.mg-input');
    const input = form.querySelector('input');
    const mic = form.querySelector('.mg-mic');

    const LABELS = { wake: 'Waking up…', idle: 'Ask me anything', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…' };
    let state = 'wake';
    let busy = false;

    function setState(next) {
      state = next;
      stage.dataset.state = next;
      status.textContent = LABELS[next] || '';
      root.dispatchEvent(new CustomEvent('mindu:state', { detail: next }));
    }

    function addMessage(who, text) {
      const el = document.createElement('div');
      el.className = `mg-msg mg-${who}`;
      el.textContent = text;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }

    async function typeOut(el, text) {
      if (reduceMotion) { el.textContent = text; return; }
      el.textContent = '';
      for (const word of text.split(' ')) {
        el.textContent += (el.textContent ? ' ' : '') + word;
        log.scrollTop = log.scrollHeight;
        await wait(70);
      }
    }

    function speak(text) {
      if (!voice) return Promise.resolve();
      return new Promise((resolve) => {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.02;
        u.onend = u.onerror = resolve;
        speechSynthesis.speak(u);
        setTimeout(resolve, 20000); // never hang if the voice engine stalls
      });
    }

    function addSources(el, sources) {
      const links = (sources || []).filter((s) => s && /^https:\/\//.test(s.url));
      if (!links.length) return;
      const box = document.createElement('div');
      box.className = 'mg-sources';
      links.forEach((s) => {
        const a = document.createElement('a');
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = `${s.title || 'GMC source'} ↗`;
        box.appendChild(a);
      });
      el.after(box);
      log.scrollTop = log.scrollHeight;
    }

    async function ask(question) {
      question = question.trim();
      if (!question || busy) return;
      busy = true;
      chips.hidden = true;
      addMessage('user', question);
      setState('thinking');
      let reply;
      let ok = true;
      try {
        [reply] = await Promise.all([answer(question, history.slice(-8)), wait(900)]);
      } catch (err) {
        console.error('Mindu answer failed', err);
        ok = false;
        reply = err && err.userMessage ? err.userMessage : "Sorry, I couldn't reach my answers just now. Please try again.";
      }
      const text = typeof reply === 'string' ? reply : (reply && reply.text) || '';
      if (ok) history.push({ role: 'user', content: question }, { role: 'assistant', content: text });
      setState('speaking');
      const el = addMessage('bot', '');
      await Promise.all([typeOut(el, text), speak(text)]);
      if (reply && reply.sources) addSources(el, reply.sources);
      setState('idle');
      busy = false;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value;
      input.value = '';
      ask(q);
    });

    // Typing counts as listening.
    let typingTimer;
    input.addEventListener('input', () => {
      if (busy) return;
      setState(input.value ? 'listening' : 'idle');
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => !busy && setState('idle'), 2500);
    });

    if (Recognition) {
      mic.addEventListener('click', () => {
        if (busy) return;
        const rec = new Recognition();
        rec.lang = 'en-US';
        rec.interimResults = true;
        mic.classList.add('mg-on');
        setState('listening');
        rec.onresult = (e) => { input.value = Array.from(e.results).map((r) => r[0].transcript).join(''); };
        rec.onend = () => {
          mic.classList.remove('mg-on');
          const q = input.value;
          input.value = '';
          if (q.trim()) ask(q); else setState('idle');
        };
        rec.onerror = () => rec.stop();
        rec.start();
      });
    } else if (canRecord) {
      // No built-in speech recognition: record a clip and send it to `transcribe`.
      let recorder = null;
      mic.addEventListener('click', async () => {
        if (recorder) { recorder.stop(); return; } // second tap stops recording
        if (busy) return;
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
          status.textContent = 'Microphone permission was blocked.';
          return;
        }
        const chunks = [];
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          mic.classList.remove('mg-on');
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          recorder = null;
          setState('thinking');
          status.textContent = 'Listening back…';
          try {
            const q = await opts.transcribe(blob);
            if (q && q.trim()) { setState('idle'); ask(q); return; }
          } catch (err) {
            console.error('Mindu transcription failed', err);
            setState('idle');
            status.textContent = (err && err.userMessage) || "I couldn't hear that. Please type your question.";
            return;
          }
          setState('idle');
        };
        mic.classList.add('mg-on');
        setState('listening');
        recorder.start();
        setTimeout(() => recorder && recorder.state === 'recording' && recorder.stop(), 15000);
      });
    }

    const suggestions = opts.suggestions || ['What is GMC?', 'Where should I go?', 'Who are you?'];
    suggestions.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mg-chip';
      b.textContent = s;
      b.addEventListener('click', () => ask(s));
      chips.appendChild(b);
    });

    // Wake-up: draw the logo, then greet.
    // opts.wake === false skips the draw (the intro already drew it);
    // opts.autoGreet === false waits for an explicit greet() call.
    let greeted = false;

    // opts.restore: an earlier conversation ([{ role, content }]) shown without typing.
    const restore = Array.isArray(opts.restore) ? opts.restore : [];
    restore.forEach((m) => {
      if (!m || typeof m.content !== 'string' || (m.role !== 'user' && m.role !== 'assistant')) return;
      addMessage(m.role === 'user' ? 'user' : 'bot', m.content);
      history.push({ role: m.role, content: m.content });
    });
    if (history.length) { greeted = true; chips.hidden = true; }

    async function greet() {
      if (greeted) return;
      greeted = true;
      setState('speaking');
      const greeting = opts.greeting || "Kuzuzangpo la! I'm your GMC guide to Gelephu Mindfulness City.";
      await typeOut(addMessage('bot', ''), greeting);
      setState('idle');
    }
    setState(opts.wake === false ? 'idle' : 'wake');
    if (opts.autoGreet !== false) {
      (async () => {
        if (opts.wake !== false) await wait(reduceMotion ? 0 : 2200);
        greet();
      })();
    }

    return { setState, ask, greet, transcript: () => history.slice(), get state() { return state; } };
  }

  window.MinduGuide = { mount, logoSvg };
})();
