const app = document.querySelector('#app');
const params = new URLSearchParams(location.search);
const roomNames = {
  vision: 'The Vision',
  blueprint: 'Urban Blueprint',
  economy: 'Economy of Tomorrow',
  future: 'My City, My Future'
};
const roomSubtitles = {
  vision: 'Begin with the purpose behind GMC.',
  blueprint: 'Explore the shape of the future city.',
  economy: 'Discover sectors and opportunities.',
  future: 'Imagine your place in the city.'
};
let visit = null;
let messages = [];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function icon() { return '<span class="mascot" aria-hidden="true"><span class="mascot-eye"></span><span class="mascot-eye"></span><span class="mascot-smile">⌣</span></span>'; }
function shell(content, active = '') {
  app.innerHTML = `<div class="app-shell"><header class="topbar"><a class="brand" href="/">${icon()}<span><strong>Mindu</strong><small>YOUR GMC COMPANION</small></span></a><nav aria-label="Main navigation"><a class="${active === 'book' ? 'active' : ''}" href="/">Book a demo visit</a><a class="${active === 'kiosk' ? 'active' : ''}" href="/?view=kiosk">Reception screen</a>${visit ? `<a class="${active === 'phone' ? 'active' : ''}" href="/?view=phone&code=${encodeURIComponent(visit.code)}">Phone guide</a>` : ''}</nav></header><main>${content}</main><footer>Hackathon prototype · Scripted guide responses · No real ticket purchase</footer></div>`;
}
function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast'; el.role = 'status'; el.textContent = message;
  document.body.append(el); setTimeout(() => el.remove(), 4000);
}
async function api(url, method = 'GET', data) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}
function interestsLine() { return visit.interests.join(' · '); }
function startPage() {
  shell(`<section class="hero"><div><p class="eyebrow">A JOURNEY THAT STARTS WITH YOU</p><h1>Meet the city through your own curiosity.</h1><p class="lead">Answer a few questions before you arrive. Mindu will use them to shape your welcome and guide you through the Experience Centre.</p><span class="pill">01 Book</span><span class="pill">02 Meet Mindu</span><span class="pill">03 Explore</span><span class="pill">04 Take a memory home</span></div><div class="hero-art"><div class="sun"></div><div class="landscape hill-one"></div><div class="landscape hill-two"></div><div class="hero-mascot">${icon()}</div><span class="art-caption">YOUR STORY, YOUR ROUTE</span></div></section><section class="panel booking"><div class="section-number">01 / BEFORE YOUR VISIT</div><h2>Tell Mindu what brings you here</h2><p>These answers shape the demo experience. Use a first name only.</p><form id="booking-form"><label>Your first name<input name="name" maxlength="40" required placeholder="e.g. Sonam"></label><label>Why are you visiting?<select name="purpose" required><option value="">Choose one</option><option>Exploring as a tourist</option><option>Looking at investment opportunities</option><option>Learning as a student</option><option>Exploring business opportunities</option><option>Learning about my community</option><option>Visiting with a delegation</option></select></label><fieldset><legend>What interests you? <small>Choose up to four</small></legend><div class="interest-grid">${['Nature & mindfulness','Urban design','Business & investment','Culture & community','Technology & innovation','Everyday life'].map(x => `<label class="chip"><input type="checkbox" name="interests" value="${x}"><span>${x}</span></label>`).join('')}</div></fieldset><button class="button primary" type="submit">Create my demo ticket <span aria-hidden="true">→</span></button></form></section>`, 'book');
  document.querySelector('#booking-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const interests = [...form.querySelectorAll('[name=interests]:checked')].map(x => x.value);
    if (!interests.length || interests.length > 4) return toast('Choose 1 to 4 interests.');
    try {
      visit = await api('/api/visits', 'POST', { name: form.elements.namedItem('name').value, purpose: form.elements.namedItem('purpose').value, interests });
      history.pushState({}, '', `/?view=ticket&code=${encodeURIComponent(visit.code)}`);
      ticketPage();
    } catch (error) { toast(error.message); }
  });
}
function ticketPage() {
  shell(`<section class="narrow"><div class="section-number">YOUR DEMO TICKET</div><h1>See you soon, ${esc(visit.name)}.</h1><p class="lead">Your visit is shaped around <strong>${esc(interestsLine())}</strong>.</p><div class="ticket panel"><div class="ticket-top"><span>GMC EXPERIENCE CENTRE</span><span>VISITOR PASS</span></div><div class="ticket-middle">${icon()}<div><small>YOUR CODE</small><strong class="ticket-code">${esc(visit.code)}</strong></div></div><p>Enter this code on the reception screen to meet Mindu.</p></div><div class="actions"><a class="button primary" href="/?view=kiosk">Go to reception demo →</a><a class="button secondary" href="/?view=phone&code=${encodeURIComponent(visit.code)}">Open phone guide</a></div><p class="note">Prototype handoff uses a code or link. A QR scanner and printed ticket can be added after the journey is validated.</p></section>`, 'book');
}
function kioskPage() {
  shell(`<section class="kiosk"><div class="kiosk-art">${icon()}<div class="halo"></div></div><p class="eyebrow">GMC EXPERIENCE CENTRE</p><h1>Welcome. Your journey begins here.</h1><p class="lead">Have a demo ticket? Enter its code to meet your guide.</p><form id="lookup-form" class="lookup"><input aria-label="Ticket code" name="code" required placeholder="YOUR TICKET CODE" autocomplete="off" value="${esc(visit?.code || '')}"><button class="button primary">Meet Mindu →</button></form><p class="note">Reception prototype · portrait screen friendly</p></section>`, 'kiosk');
  document.querySelector('#lookup-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const code = event.currentTarget.elements.namedItem('code').value.trim().toUpperCase();
      visit = await api(`/api/visits/${encodeURIComponent(code)}`);
      history.pushState({}, '', `/?view=welcome&code=${encodeURIComponent(code)}`);
      welcomePage();
    } catch (error) { toast(error.message); }
  });
}
function welcomePage() {
  const focus = visit.interests[0];
  shell(`<section class="kiosk welcome"><div class="kiosk-art">${icon()}<div class="halo"></div></div><p class="eyebrow">A PERSONAL WELCOME</p><h1>Kuzuzangpo la, ${esc(visit.name)}.</h1><p class="lead">I’m Mindu. I see you’re curious about <strong>${esc(focus)}</strong>. Let’s start with the vision, then discover the rooms that speak to you.</p><div class="welcome-card"><span class="section-number">YOUR FIRST STOP</span><h2>Chamber 1 · The Vision</h2><p>Step into GMC’s big picture. Your guide will continue on your phone as you explore.</p></div><a class="button primary" href="/?view=phone&code=${encodeURIComponent(visit.code)}">Continue on my phone →</a><p class="note">In the final system this handoff link can be shown as a QR code on the screen.</p></section>`, 'kiosk');
}
function mapMarkup() {
  return `<div class="map" role="group" aria-label="Choose your chamber"><div class="map-corridor">RECEPTION <span>→</span> YOUR JOURNEY <span>→</span> EXIT</div><div class="map-rooms">${Object.entries(roomNames).map(([key, label], i) => `<button class="room ${visit.currentRoom === key ? 'selected' : ''} ${visit.visitedRooms.includes(key) ? 'visited' : ''}" data-room="${key}"><span class="room-no">0${i+1}</span><strong>${label}</strong><small>${visit.visitedRooms.includes(key) ? '✓ Visited' : 'Tap when you enter'}</small></button>`).join('')}</div></div>`;
}
function phonePage() {
  const room = visit.currentRoom;
  shell(`<section class="phone-layout"><aside><div class="section-number">YOUR JOURNEY</div><h1>Hello, ${esc(visit.name)}.</h1><p>Your guide follows you from room to room.</p><div class="profile-card"><span>YOUR INTERESTS</span><strong>${esc(interestsLine())}</strong></div>${mapMarkup()}<p class="note">Tap the chamber when you enter it. This map does not track your position.</p><a class="text-link" href="/?view=postcard&code=${encodeURIComponent(visit.code)}">Finish and make my postcard →</a></aside><div class="conversation panel"><div class="conversation-head">${icon()}<div><strong>Mindu</strong><small>${room ? `Chamber · ${roomNames[room]}` : 'Choose a chamber to begin'}</small></div><span class="demo-label">SCRIPTED DEMO</span></div><div class="messages" id="messages" aria-live="polite"><div class="message mindu">${room ? `You’re in ${roomNames[room]}. ${roomSubtitles[room]} What would you like to know?` : 'Tap a chamber on the map and ask me a question. I’ll tailor the conversation to your visit.'}</div>${messages.map(m => `<div class="message ${m.role}">${esc(m.text).replace(/\n/g, '<br>')}</div>`).join('')}</div><form id="chat-form" class="chat-form"><input name="question" aria-label="Ask Mindu" placeholder="Ask about this chamber…" required><button class="button primary">Send</button></form><button id="guide-question" class="guide-link">Ask a human guide instead ↗</button></div></section>`, 'phone');
  document.querySelectorAll('[data-room]').forEach(button => button.addEventListener('click', async () => {
    try {
      visit = await api(`/api/visits/${visit.code}/room`, 'POST', { room: button.dataset.room });
      messages = [];
      phonePage();
    } catch (error) { toast(error.message); }
  }));
  document.querySelector('#chat-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const question = form.elements.namedItem('question').value.trim();
    if (!visit.currentRoom) return toast('Choose a chamber first.');
    messages.push({ role: 'visitor', text: question });
    form.reset();
    phonePage();
    try {
      const answer = await api(`/api/visits/${visit.code}/chat`, 'POST', { question });
      messages.push({ role: 'mindu', text: answer.reply });
      phonePage();
    } catch (error) { toast(error.message); }
  });
  document.querySelector('#guide-question').addEventListener('click', async () => {
    const question = prompt('What would you like to ask a guide?');
    if (!question?.trim()) return;
    try {
      await api(`/api/visits/${visit.code}/questions`, 'POST', { question });
      toast('Question saved for a guide in this prototype.');
    } catch (error) { toast(error.message); }
  });
}
function postcardPage() {
  const stamps = visit.visitedRooms.map(r => roomNames[r]);
  shell(`<section class="narrow ending"><div class="section-number">THE END OF YOUR VISIT</div><h1>What will you carry forward?</h1><p class="lead">Choose one thought to make your journey yours.</p><form id="reflection-form" class="reflection"><label>What part of GMC would you like to see become real?<textarea name="reflection" maxlength="180" rows="3" placeholder="The future I hope to see…">${esc(visit.reflection)}</textarea></label><button class="button secondary">Update my postcard</button></form><article class="postcard" id="postcard"><div class="postcard-top"><span>GELEPHU MINDFULNESS CITY</span><span>MY FUTURE POSTCARD</span></div><div class="postcard-art">${icon()}<span>THE FUTURE BEGINS WITH CURIOSITY</span></div><div class="postcard-body"><div><small>THIS JOURNEY BELONGS TO</small><h2>${esc(visit.name)}</h2><p>Drawn to ${esc(interestsLine())}.</p></div><div><small>CHAMBERS EXPLORED</small><p>${stamps.length ? esc(stamps.join(' · ')) : 'Your journey is just beginning.'}</p><small>MY THOUGHT</small><blockquote>${esc(visit.reflection || 'A thought to take into tomorrow.')}</blockquote></div></div></article><div class="actions no-print"><button class="button primary" id="print-postcard">Save or print postcard ↗</button><a class="button secondary" href="/?view=phone&code=${encodeURIComponent(visit.code)}">Keep exploring</a></div><p class="note no-print">Use your browser’s print dialog to save this as a PDF. A shareable image can be added in the next build.</p></section>`, 'phone');
  document.querySelector('#reflection-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      visit = await api(`/api/visits/${visit.code}/reflection`, 'POST', { reflection: event.currentTarget.elements.namedItem('reflection').value });
      postcardPage();
      toast('Postcard updated.');
    } catch (error) { toast(error.message); }
  });
  document.querySelector('#print-postcard').addEventListener('click', () => print());
}
async function init() {
  const code = params.get('code');
  if (code) {
    try { visit = await api(`/api/visits/${encodeURIComponent(code.toUpperCase())}`); }
    catch { toast('Ticket not found. Start a new demo visit.'); }
  }
  const view = params.get('view');
  if (view === 'kiosk') kioskPage();
  else if (view === 'welcome' && visit) welcomePage();
  else if (view === 'phone' && visit) phonePage();
  else if (view === 'ticket' && visit) ticketPage();
  else if (view === 'postcard' && visit) postcardPage();
  else startPage();
}
init();
