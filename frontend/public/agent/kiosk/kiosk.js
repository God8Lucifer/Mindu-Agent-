/*
 * Kiosk intro for the Mindu guide.
 *
 *   welcome → a phone chat QR code appears
 *   chat    → every entry uses the same GMC guide, greeting, tools and AI backend
 *   scan    → the logo shrinks into the QR, confirms the handoff, then returns to welcome
 *   links   → side buttons in the chat (map, camera) open those pages with a circular
 *             reveal from the button, and bring you back with the chat restored
 *
 * Usage: MinduKiosk.start({ intro, guide, mountGuide: (el) => MinduGuide.mount(el, {...}) })
 */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const EASE = 'cubic-bezier(0.65, 0, 0.25, 1)';

  // Every page shares the light/dark choice (data-theme on <html>).
  const isDark = () => document.documentElement.dataset.theme === 'dark';

  const ICONS = {
    map: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>`,
    photo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10.5H4z"/><circle cx="12" cy="13.5" r="3.4"/></svg>`,
  };

  /*
   * links: side buttons in the chat that open other pages of the experience, e.g.
   *   [{ id: 'map', button, url, label: 'Opening the Experience Centre map…' }]
   * The transition circle follows the light/dark theme, like the pages it opens.
   * The page is opened with ?back=<this page>?from=<id> so it can link back here.
   */
  function start({ intro, guide: guideEl, mountGuide, restart, links = [] }) {
    links = links.filter((l) => l && l.button && l.url);
    const showLinks = (on) => links.forEach((l) => { l.button.hidden = !on && !l.alwaysVisible; });
    let busy = false;
    let stage;
    let currentGuide = null;
    let qrTimer;
    const params = new URLSearchParams(location.search);
    const onPhone = params.get('mobile') === '1';
    const CHAT_KEY = 'mindu-chat';
    const saveChat = (msgs) => { try { sessionStorage.setItem(CHAT_KEY, JSON.stringify(msgs)); } catch {} };
    const loadChat = () => { try { return JSON.parse(sessionStorage.getItem(CHAT_KEY) || '[]'); } catch { return []; } };
    const clearChat = () => { try { sessionStorage.removeItem(CHAT_KEY); } catch {} };

    async function handoffRequest(body) {
      const response = await fetch('/api/handoff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not connect.');
      return data;
    }

    async function prepareQr() {
      clearTimeout(qrTimer);
      const code = intro.querySelector('.ks-qr');
      const hint = intro.querySelector('.ks-qr-hint');
      const active = () => code.isConnected && intro.dataset.step === 'welcome';
      try {
        const session = await handoffRequest({ action: 'create' });
        if (!active()) return;
        code.innerHTML = session.svg;
        code.href = session.url;
        code.setAttribute('aria-label', 'Open the GMC phone guide');
        hint.textContent = '';
        async function poll() {
          if (!active()) return;
          try {
            const response = await fetch(`/api/handoff?id=${session.id}`, { cache: 'no-store' });
            if (response.status === 410) { if (active()) prepareQr(); return; }
            if (!response.ok) throw new Error('Connection lost');
            const status = await response.json();
            if (!active()) return;
            if (status.claimed) { confirmHandoff(session.id); return; }
            hint.textContent = '';
          } catch {
            if (active()) hint.textContent = 'Reconnecting to the kiosk…';
          }
          if (active()) qrTimer = setTimeout(poll, 500);
        }
        qrTimer = setTimeout(poll, 500);
      } catch {
        if (active()) {
          hint.textContent = 'Preparing your QR code… Check the network connection.';
          qrTimer = setTimeout(prepareQr, 5000);
        }
      }
    }

    function flyTo(target, scale, extra = '') {
      const a = stage.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      stage.style.transition = `transform 0.95s ${EASE}, opacity 0.95s ${EASE}`;
      stage.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      if (extra) stage.style.opacity = extra;
    }

    function showIntro({ animateLogo = false } = {}) {
      clearTimeout(qrTimer);
      busy = true;
      currentGuide?.destroy?.();
      currentGuide = null;
      clearChat();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      guideEl.hidden = true;
      guideEl.innerHTML = '';
      guideEl.className = '';
      if (restart) restart.hidden = true;
      showLinks(false);

      intro.hidden = false;
      intro.className = 'mg ks';
      intro.dataset.step = animateLogo ? 'returning' : 'welcome';
      intro.innerHTML = `
        <div class="ks-hero">
          <div class="mg-stage ks-welcome-logo" data-state="wake" role="img" aria-label="GMC logo">
            <span class="mg-ring"></span><span class="mg-ring"></span><span class="mg-ring"></span>
            ${MinduGuide.logoSvg()}
          </div>
          <p class="ks-title">Welcome to the GMC Experience<span>Discover Gelephu Mindfulness City</span></p>
        </div>
        <div class="ks-welcome"><div class="ks-welcome-inner">
          <a class="ks-qr" target="_blank" rel="noopener" aria-label="Preparing QR code"></a>
          <p class="ks-qr-label">Scan to begin your GMC journey</p>
          <p class="ks-qr-hint">Preparing your QR code…</p>
        </div></div>
        <div class="ks-done" role="status"></div>`;
      const welcomeLogo = intro.querySelector('.ks-welcome-logo');
      const revealQr = () => {
        if (!welcomeLogo.isConnected) return;
        intro.dataset.step = 'welcome';
        busy = false;
        prepareQr();
      };
      if (animateLogo) {
        // Replay the large logo only after a successful phone handoff.
        wait(2400).then(() => {
          if (!welcomeLogo.isConnected) return;
          welcomeLogo.dataset.state = 'idle';
          revealQr();
        });
      } else {
        revealQr();
        wait(2400).then(() => {
          if (welcomeLogo.isConnected && intro.dataset.step === 'welcome') welcomeLogo.dataset.state = 'idle';
        });
      }
    }

    async function confirmHandoff(id) {
      if (busy) return;
      busy = true;
      clearTimeout(qrTimer);
      stage = intro.querySelector('.ks-welcome-logo');
      const qr = intro.querySelector('.ks-qr');
      intro.dataset.step = 'handoff';
      intro.querySelector('.ks-qr-label').textContent = 'Connecting to your phone…';
      stage.dataset.state = 'speaking';
      await wait(100);
      flyTo(qr, 0.18, '0');
      qr.classList.add('ks-qr-pulse');
      await wait(1000);

      // The phone waits in its orange pairing screen until the logo arrives.
      let connected = false;
      try {
        await handoffRequest({ action: 'complete', id });
        connected = true;
      } catch { /* Both devices offer a fresh attempt if the connection drops. */ }

      intro.dataset.step = 'sent';
      intro.querySelector('.ks-done').innerHTML = `
        <div class="ks-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <p class="ks-done-title">${connected ? 'GMC is now on your phone' : 'Connection interrupted'}</p>
        <p class="ks-done-sub">${connected ? 'Enjoy the GMC Experience Centre. Your guide goes with you.' : 'Please scan the new QR code to try again.'}</p>`;
      await wait(connected ? 2000 : 4200);
      showIntro({ animateLogo: connected });
    }

    async function enterGuide() {
      if (busy) return;
      busy = true;
      clearTimeout(qrTimer);
      intro.dataset.step = 'entering';
      intro.innerHTML = `
        <div class="ks-hero">
          <div class="mg-stage ks-stage" data-state="wake">
            <span class="mg-ring"></span><span class="mg-ring"></span><span class="mg-ring"></span>
            ${MinduGuide.logoSvg()}
          </div>
          <p class="ks-title ks-enter-title">Welcome to GMC</p>
        </div>`;
      stage = intro.querySelector('.ks-stage');

      await wait(2400); // Let the logo finish drawing before it moves into the chat.
      stage.dataset.state = 'idle';
      await wait(500);
      await revealChat();
    }

    async function revealChat() {
      // Shared by QR pairing, direct phone entry and pairing recovery.
      busy = true;
      intro.dataset.step = 'leaving';
      stage.dataset.state = 'speaking';

      const guide = (currentGuide = mountGuide(guideEl, { wake: false, autoGreet: false, restore: onPhone ? loadChat() : [] }));
      guideEl.hidden = false;
      guideEl.classList.add('ks-enter');
      const target = guideEl.querySelector('.mg-stage');
      target.style.visibility = 'hidden';

      await wait(250);
      flyTo(target, target.offsetWidth / stage.offsetWidth);
      await wait(950);

      target.style.visibility = '';
      intro.hidden = true;
      intro.innerHTML = '';
      guideEl.classList.add('ks-in');
      if (restart) restart.hidden = onPhone;
      showLinks(true);
      if (onPhone) history.replaceState(null, '', `${location.pathname}?mobile=1`);
      guide.greet();
      busy = false;
    }

    function veilAt(button, className) {
      const r = button.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const veil = document.createElement('div');
      veil.className = className;
      veil.style.setProperty('--x', `${cx}px`);
      veil.style.setProperty('--y', `${cy}px`);
      veil.style.setProperty('--r', `${Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy))}px`);
      document.body.appendChild(veil);
      return veil;
    }

    // Open a linked page: a circle in the page's paper colour grows from the button.
    async function openLink(link) {
      if (busy) return;
      busy = true;
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      const veil = veilAt(link.button, `ks-veil${isDark() ? ' ks-veil-dark' : ''}`);
      veil.innerHTML = `<div class="ks-veil-inner">${ICONS[link.id] || ''}<p>${link.label || 'Opening…'}</p></div>`;
      requestAnimationFrame(() => veil.classList.add('ks-veil-open'));
      if (currentGuide) saveChat(currentGuide.transcript());
      await wait(1100);
      const back = `${location.origin}${location.pathname}?from=${encodeURIComponent(link.id)}${onPhone ? '&mobile=1' : ''}`;
      window.location.href = `${link.url}${link.url.includes('?') ? '&' : '?'}back=${encodeURIComponent(back)}`;
    }

    // Back from a linked page: skip the intro, restore the chat, and shrink the
    // page colour back into the button it was opened from.
    async function returnFrom(link) {
      busy = true;
      history.replaceState(null, '', `${location.pathname}${onPhone ? '?mobile=1' : ''}`);
      intro.hidden = true;
      const restore = loadChat();
      currentGuide = mountGuide(guideEl, { wake: false, autoGreet: false, restore });
      guideEl.hidden = false;
      guideEl.classList.add('ks-enter');
      if (restart) restart.hidden = onPhone;
      showLinks(true);

      const veil = veilAt(link.button, `ks-veil ks-veil-open ks-veil-back${isDark() ? ' ks-veil-dark' : ''}`);
      await wait(150);
      veil.classList.remove('ks-veil-open');
      guideEl.classList.add('ks-in');
      await wait(950);
      veil.remove();
      busy = false;
      if (!restore.length) currentGuide.greet();
    }
    // Coming back with the browser's Back button: remove the veil.
    window.addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      document.querySelectorAll('.ks-veil').forEach((v) => v.remove());
      busy = false;
    });
    window.addEventListener('pagehide', () => {
      if (onPhone && currentGuide) saveChat(currentGuide.transcript());
    });

    if (restart) restart.addEventListener('click', () => !busy && showIntro());
    links.forEach((link) => {
      if (ICONS[link.id]) link.button.innerHTML = ICONS[link.id];
      link.button.addEventListener('click', (event) => { event.preventDefault(); openLink(link); });
    });
    async function openPhoneGuide() {
      busy = true;
      intro.hidden = false;
      intro.className = 'mg ks';
      intro.dataset.step = 'pairing';
      if (restart) restart.hidden = true;
      showLinks(false);
      const id = params.get('handoff');
      if (!id) { busy = false; await enterGuide(); return; }
      const fallbackLogo = `<div class="mg-stage ks-code-fallback" data-state="wake" role="img" aria-label="GMC logo">${MinduGuide.logoSvg()}</div>`;
      const animateFallback = () => {
        const logo = intro.querySelector('.ks-code-fallback');
        wait(2400).then(() => { if (logo?.isConnected) logo.dataset.state = 'idle'; });
      };
      intro.innerHTML = `
        <div class="ks-hero">
          <div class="ks-phone-box">
            <div class="ks-phone-code">${fallbackLogo}</div>
            <div class="mg-stage ks-phone-logo" data-state="idle">
              <span class="mg-ring"></span><span class="mg-ring"></span><span class="mg-ring"></span>
              ${MinduGuide.logoSvg()}
            </div>
          </div>
          <p class="ks-title">Pairing with GMC<span role="status">Connecting to the kiosk…</span></p>
          <div class="ks-pair-actions" hidden>
            <button type="button" class="ks-guest ks-pair-retry">Try again</button>
            <button type="button" class="ks-guest ks-pair-skip">Open chat</button>
          </div>
        </div>`;
      animateFallback();
      try {
        let status = await handoffRequest({ action: 'claim', id });
        if (status.svg) intro.querySelector('.ks-phone-code').innerHTML = status.svg;
        intro.querySelector('.ks-title span').textContent = 'Receiving your guide. Keep this screen open.';
        const deadline = Date.now() + 20000;
        while (!status.connected) {
          if (Date.now() >= deadline) throw new Error('The kiosk is not responding. Try again or open chat.');
          // Network polling keeps its real delay even with reduced motion enabled.
          await new Promise((resolve) => setTimeout(resolve, 250));
          const response = await fetch(`/api/handoff?id=${encodeURIComponent(id)}`, {
            cache: 'no-store', signal: AbortSignal.timeout(6000),
          });
          if (!response.ok) throw new Error('This connection expired. Scan the new code or open chat.');
          status = await response.json();
        }
        intro.dataset.step = 'paired';
        intro.querySelector('.ks-title').innerHTML = 'Welcome to GMC<span role="status">Connected. Your guide is ready.</span>';
        stage = intro.querySelector('.ks-phone-logo');
        // The logo emerges from the same QR after the kiosk sends it.
        await wait(1000);
        await revealChat();
      } catch (error) {
        intro.dataset.step = 'pair-error';
        intro.querySelector('.ks-phone-code').innerHTML = fallbackLogo;
        animateFallback();
        intro.querySelector('.ks-title span').textContent = error.name === 'TimeoutError'
          ? 'Connection timed out. Try again or open chat.' : error.message;
        intro.querySelector('.ks-pair-actions').hidden = false;
        intro.querySelector('.ks-pair-retry').addEventListener('click', openPhoneGuide);
        intro.querySelector('.ks-pair-skip').addEventListener('click', () => { busy = false; enterGuide(); });
      }
    }

    const from = params.get('from');
    const backFrom = links.find((l) => l.id === from);
    if (backFrom) returnFrom(backFrom);
    else if (onPhone) openPhoneGuide();
    else showIntro();
  }

  window.MinduKiosk = { start };
})();
