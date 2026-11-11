/*
 * Kiosk intro for the Mindu guide.
 *
 *   welcome → a phone chat QR code and "Continue as guest" appear
 *   guest   → the GMC logo draws with a welcome message, then moves into the chat
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
    const showLinks = (on) => links.forEach((l) => { l.button.hidden = !on; });
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
        hint.textContent = 'Connect your phone to the same Wi-Fi, then scan and open the link.';
        async function poll() {
          if (!active()) return;
          try {
            const response = await fetch(`/api/handoff?id=${session.id}`, { cache: 'no-store' });
            if (response.status === 410) { if (active()) prepareQr(); return; }
            if (!response.ok) throw new Error('Connection lost');
            const status = await response.json();
            if (!active()) return;
            if (status.claimed) { confirmHandoff(); return; }
            hint.textContent = 'Connect your phone to the same Wi-Fi, then scan and open the link.';
          } catch {
            if (active()) hint.textContent = 'Reconnecting to the kiosk…';
          }
          if (active()) qrTimer = setTimeout(poll, 1500);
        }
        qrTimer = setTimeout(poll, 1500);
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

    function showIntro() {
      clearTimeout(qrTimer);
      busy = true;
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
      intro.dataset.step = 'welcome';
      intro.innerHTML = `
        <div class="ks-hero">
          <div class="mg-stage ks-welcome-logo" data-state="wake" role="img" aria-label="GMC logo">
            <span class="mg-ring"></span><span class="mg-ring"></span><span class="mg-ring"></span>
            ${MinduGuide.logoSvg()}
          </div>
          <p class="ks-title">GMC<span>Your guide to Gelephu Mindfulness City</span></p>
        </div>
        <div class="ks-welcome"><div class="ks-welcome-inner">
          <a class="ks-qr" target="_blank" rel="noopener" aria-label="Preparing QR code"></a>
          <p class="ks-qr-label">Scan with your phone to take the GMC guide with you</p>
          <p class="ks-qr-hint">Preparing your QR code…</p>
          <div class="ks-or"><span>or</span></div>
          <button type="button" class="ks-guest">Continue as guest</button>
        </div></div>
        <div class="ks-done" role="status"></div>`;
      intro.querySelector('.ks-guest').addEventListener('click', enterGuide);
      busy = false;
      prepareQr();
      const welcomeLogo = intro.querySelector('.ks-welcome-logo');
      wait(2400).then(() => {
        if (welcomeLogo.isConnected && intro.dataset.step === 'welcome') welcomeLogo.dataset.state = 'idle';
      });
    }

    async function confirmHandoff() {
      if (busy) return;
      busy = true;
      clearTimeout(qrTimer);
      stage = intro.querySelector('.ks-welcome-logo');
      const qr = intro.querySelector('.ks-qr');
      intro.dataset.step = 'handoff';
      stage.dataset.state = 'speaking';
      await wait(500);
      flyTo(qr, 0.18, '0');
      qr.classList.add('ks-qr-pulse');
      await wait(1000);

      intro.dataset.step = 'sent';
      intro.querySelector('.ks-done').innerHTML = `
        <div class="ks-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <p class="ks-done-title">GMC is now on your phone</p>
        <p class="ks-done-sub">Enjoy the GMC Experience Centre. Your guide goes with you.</p>`;
      await wait(4200);
      showIntro();
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
      intro.dataset.step = 'leaving';
      stage.dataset.state = 'speaking';

      const guide = (currentGuide = mountGuide(guideEl, { wake: false, autoGreet: false }));
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

    if (restart) restart.addEventListener('click', () => !busy && showIntro());
    links.forEach((link) => {
      link.button.innerHTML = ICONS[link.id] || '';
      link.button.addEventListener('click', () => openLink(link));
    });
    async function openPhoneGuide() {
      intro.hidden = false;
      intro.className = 'mg ks';
      if (restart) restart.hidden = true;
      await enterGuide();
      // Confirm only once the chat UI is ready on the visitor's device.
      const id = params.get('handoff');
      if (id) {
        try { await handoffRequest({ action: 'claim', id }); }
        catch { /* An expired kiosk code never blocks an already-open phone chat. */ }
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
