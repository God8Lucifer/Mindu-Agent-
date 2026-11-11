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
    root.minduDestroy?.();
    const answer = opts.answer || scriptedAnswer;
    const voice = opts.voice !== false && 'speechSynthesis' in window;
    let voiceInput;
    let voicePhase = 'idle';
    const history = []; // { role: 'user' | 'assistant', content }

    root.classList.add('mg');
    root.dataset.conversation = 'intro';
    root.innerHTML = `
      <div class="mg-stage" data-state="wake">
        <span class="mg-ring"></span><span class="mg-ring"></span><span class="mg-ring"></span>
        ${logoSvg()}
      </div>
      <p class="mg-name">GMC</p>
      <p class="mg-status" aria-live="polite"></p>
      <p class="mg-voice-hint" hidden></p>
      <div class="mg-voice-actions" hidden>
        <button type="button" class="mg-retry">Try microphone again</button>
        <button type="button" class="mg-type">Type instead</button>
      </div>
      <div class="mg-log" role="log" aria-label="Conversation" aria-live="polite" tabindex="0"></div>
      <div class="mg-chips"></div>
      <form class="mg-input">
        <button type="button" class="mg-mic" aria-label="Speak to GMC" hidden>
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
    const send = form.querySelector('.mg-send');
    const voiceActions = root.querySelector('.mg-voice-actions');

    const LABELS = { wake: 'Waking up…', idle: 'Ask me anything', listening: 'Listening… Tap the microphone to finish.', transcribing: 'Transcribing…', requesting: 'Opening microphone…', thinking: 'Preparing a reply…', speaking: 'Speaking…' };
    let state = 'wake';
    let busy = false;
    let replyCount = 0;
    let followLatest = true;

    function fitConversation() {
      root.dataset.conversation = replyCount >= 4 ? 'long' : replyCount >= 2 ? 'conversation' : replyCount ? 'reply' : 'intro';
    }

    function scrollLatest() {
      if (followLatest) log.scrollTop = log.scrollHeight;
    }
    log.addEventListener('scroll', () => {
      followLatest = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
    }, { passive: true });
    stage.addEventListener('transitionend', scrollLatest);

    function setState(next) {
      state = next;
      stage.dataset.state = next;
      status.textContent = LABELS[next] || '';
      root.dispatchEvent(new CustomEvent('mindu:state', { detail: next }));
    }

    function updateControls() {
      send.disabled = busy || !!voiceInput?.active;
      mic.disabled = busy || ['transcribing', 'requesting'].includes(voicePhase);
      mic.setAttribute('aria-label', voicePhase === 'listening' ? 'Finish speaking' : 'Speak to GMC');
      mic.setAttribute('aria-pressed', String(voicePhase === 'listening'));
      mic.classList.toggle('mg-on', voicePhase === 'listening');
    }

    function addMessage(who, text) {
      const el = document.createElement('div');
      el.className = `mg-msg mg-${who}`;
      el.textContent = text;
      log.appendChild(el);
      scrollLatest();
      return el;
    }

    async function typeOut(el, text) {
      if (reduceMotion) { el.textContent = text; scrollLatest(); return; }
      el.textContent = '';
      for (const word of text.split(' ')) {
        el.textContent += (el.textContent ? ' ' : '') + word;
        scrollLatest();
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
      const links = (Array.isArray(sources) ? sources : []).filter((s) => s && /^https:\/\//.test(s.url));
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
      scrollLatest();
    }

    async function ask(question) {
      question = question.trim();
      if (!question || busy || voiceInput?.active) return;
      busy = true;
      followLatest = true;
      clearTimeout(typingTimer);
      voiceActions.hidden = true;
      updateControls();
      chips.hidden = true;
      addMessage('user', question);
      setState('thinking');
      let reply;
      let ok = true;
      try {
        [reply] = await Promise.all([answer(question, history.slice(-8).map(({ role, content }) => ({ role, content }))), wait(900)]);
      } catch (err) {
        console.error('Mindu answer failed', err);
        ok = false;
        reply = err && err.userMessage ? err.userMessage : "Sorry, I couldn't reach my answers just now. Please try again.";
      }
      const text = typeof reply === 'string' ? reply : (reply && reply.text) || '';
      replyCount += 1;
      fitConversation();
      if (ok) history.push({ role: 'user', content: question }, { role: 'assistant', content: text, sources: typeof reply === 'object' ? reply?.sources || [] : [] });
      setState('speaking');
      const el = addMessage('bot', '');
      await Promise.all([typeOut(el, text), speak(text)]);
      if (reply && reply.sources) addSources(el, reply.sources);
      setState('idle');
      busy = false;
      updateControls();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (busy || voiceInput?.active) return;
      const q = input.value;
      input.value = '';
      ask(q);
    });

    // Typed drafts remain separate from an active microphone capture.
    let typingTimer;
    input.addEventListener('input', () => {
      if (busy || voiceInput?.active) return;
      voiceActions.hidden = true;
      setState('idle');
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => !busy && !voiceInput?.active && setState('idle'), 2500);
    });

    voiceInput = opts.mic === false ? null : window.MinduVoice?.createVoiceInput({
      transcribe: opts.transcribe,
      onState(next) {
        voicePhase = next;
        clearTimeout(typingTimer);
        if (next !== 'idle') voiceActions.hidden = true;
        setState(next);
        updateControls();
      },
      onTranscript(question) { ask(question); },
      onError(message) {
        status.textContent = message;
        voiceActions.hidden = false;
      },
    });
    // Keep the voice entry visible; unsupported capture explains how to recover.
    mic.hidden = opts.mic === false;
    const voiceHint = root.querySelector('.mg-voice-hint');
    if (opts.mic !== false && voiceInput?.availabilityMessage) {
      voiceHint.textContent = voiceInput.availabilityMessage;
      voiceHint.hidden = false;
    }
    mic.addEventListener('click', () => {
      if (busy) return;
      if (!voiceInput) {
        status.textContent = 'Voice input is unavailable. Please type your question.';
        voiceActions.hidden = false;
        return;
      }
      if (voiceInput.active) voiceInput.stop();
      else {
        if (voice) speechSynthesis.cancel();
        voiceInput.start();
      }
    });
    root.querySelector('.mg-retry').addEventListener('click', () => { if (!busy) voiceInput?.start(); });
    root.querySelector('.mg-type').addEventListener('click', () => {
      voiceInput?.cancel();
      voiceActions.hidden = true;
      input.focus();
    });
    const cancelVoice = () => { if (document.hidden) voiceInput?.cancel(); };
    document.addEventListener('visibilitychange', cancelVoice);
    const cancelOnPageHide = () => voiceInput?.cancel();
    const destroy = () => {
      clearTimeout(typingTimer);
      voiceInput?.destroy();
      document.removeEventListener('visibilitychange', cancelVoice);
      window.removeEventListener('pagehide', cancelOnPageHide);
    };
    window.addEventListener('pagehide', cancelOnPageHide);
    root.minduDestroy = destroy;

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
      const el = addMessage(m.role === 'user' ? 'user' : 'bot', m.content);
      if (m.role === 'assistant') addSources(el, m.sources);
      history.push({ role: m.role, content: m.content, ...(m.role === 'assistant' ? { sources: m.sources || [] } : {}) });
      if (m.role === 'assistant') replyCount += 1;
    });
    fitConversation();
    if (history.length) { greeted = true; chips.hidden = true; }

    async function greet() {
      if (greeted || busy || voiceInput?.active) return;
      greeted = true;
      setState('speaking');
      const greeting = opts.greeting || "Kuzuzangpo la! I'm your GMC guide to Gelephu Mindfulness City.";
      await typeOut(addMessage('bot', ''), greeting);
      if (!busy && !voiceInput?.active) setState('idle');
    }
    setState(opts.wake === false ? 'idle' : 'wake');
    if (opts.autoGreet !== false) {
      (async () => {
        if (opts.wake !== false) await wait(reduceMotion ? 0 : 2200);
        greet();
      })();
    }

    return { setState, ask, greet, destroy, transcript: () => history.slice(), get state() { return state; } };
  }

  window.MinduGuide = { mount, logoSvg };
})();
