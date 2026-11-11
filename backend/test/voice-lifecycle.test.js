import test from 'node:test';
import assert from 'node:assert/strict';
import voice from '../../frontend/public/agent/guide/gmc-voice.js';

function setup(overrides = {}, hooks = {}) {
  const recorders = [], states = [], transcripts = [], errors = [];
  let releases = 0, uploads = 0;
  class Recorder {
    static isTypeSupported(type) { return type === 'audio/mp4'; }
    constructor(_, options) { this.mimeType = options.mimeType; this.state = 'inactive'; recorders.push(this); }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable({ data: new Blob([new Uint8Array(2000)], { type: this.mimeType }) });
      this.onstop();
    }
  }
  const stream = { getTracks: () => [{ stop: () => releases++ }] };
  const input = voice.createVoiceInput({
    env: { navigator: { mediaDevices: { getUserMedia: async () => stream } }, MediaRecorder: Recorder, Blob, ...overrides },
    transcribe: async blob => { uploads++; hooks.onUpload?.(blob); assert.equal(blob.type, 'audio/mp4'); return 'What is GMC?'; },
    onState: state => states.push(state), onTranscript: text => transcripts.push(text), onError: message => errors.push(message),
  });
  return { input, recorders, states, transcripts, errors, stream, releases: () => releases, uploads: () => uploads };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('HTTP phone origins offer a secure-connection message without opening or submitting a recording', async () => {
  const flow = setup({ isSecureContext: false });
  try {
    await flow.input.start();
    await flow.input.start();
    assert.equal(flow.input.active, false);
    assert.equal(flow.recorders.length, 0);
    assert.equal(flow.uploads(), 0);
    assert.deepEqual(flow.transcripts, []);
    assert.match(flow.errors[0], /HTTPS/);
    assert.match(flow.errors[0], /retry or type/);
  } finally { flow.input.destroy(); }
});

test('old capture timeout cannot stop a new recording; duplicate start and stop upload once', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const flow = setup();
  try {
    await flow.input.start();
    await flow.input.start();
    assert.equal(flow.recorders.length, 1);
    t.mock.timers.tick(5000);
    flow.input.stop(); flow.input.stop();
    await flush();
    assert.equal(flow.uploads(), 1);
    assert.deepEqual(flow.transcripts, ['What is GMC?']);
    await flow.input.start();
    t.mock.timers.tick(10000); // The first session's original 15-second deadline.
    assert.equal(flow.recorders[1].state, 'recording');
    assert.equal(flow.uploads(), 1);
    t.mock.timers.tick(5000); // Only the new session's timer may stop it.
    await flush();
    assert.equal(flow.uploads(), 2);
    assert.equal(flow.transcripts.length, 2);
  } finally { flow.input.destroy(); }
});
test('destroy during permission prompt releases a late stream without starting a recorder', async () => {
  let resolve;
  const pending = new Promise(r => { resolve = r; });
  const flow = setup({ navigator: { mediaDevices: { getUserMedia: () => pending } } });
  const starting = flow.input.start();
  flow.input.destroy();
  resolve(flow.stream);
  await starting;
  assert.equal(flow.releases(), 1);
  assert.equal(flow.recorders.length, 0);
  assert.equal(flow.uploads(), 0);
});
test('active silence analyser rejects a silent encoded recording before transcription', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  class AudioContext {
    state = 'running';
    createAnalyser() { return { fftSize: 512, getByteTimeDomainData: data => data.fill(128) }; }
    createMediaStreamSource() { return { connect() {} }; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  const flow = setup({ AudioContext });
  try {
    await flow.input.start();
    t.mock.timers.tick(500);
    flow.input.stop();
    await flush();
    assert.equal(flow.uploads(), 0);
    assert.match(flow.errors[0], /didn’t hear any speech/);
    assert.ok(flow.releases() > 0);
  } finally { flow.input.destroy(); }
});
test('stalled recording upload unlocks after deadline and ignores late transcript', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolve;
  const pending = new Promise(r => { resolve = r; });
  const flow = setup();
  flow.input.destroy();
  const errors = [], transcripts = [];
  const input = voice.createVoiceInput({
    env: { navigator: { mediaDevices: { getUserMedia: async () => flow.stream } }, MediaRecorder: class {
      static isTypeSupported() { return true; }
      state = 'inactive'; mimeType = 'audio/webm';
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; this.ondataavailable({ data: new Blob([new Uint8Array(2000)]) }); this.onstop(); }
    }, Blob },
    transcribe: () => pending, onState() {}, onError: text => errors.push(text), onTranscript: text => transcripts.push(text),
  });
  try {
    await input.start(); input.stop();
    t.mock.timers.tick(45000);
    assert.equal(input.active, false);
    assert.match(errors[0], /timed out/);
    resolve('Late transcript'); await flush();
    assert.equal(transcripts.length, 0);
  } finally { input.destroy(); }
});

test('recording finishes automatically after detected speech followed by silence', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  let speaking = true;
  class AudioContext {
    state = 'running';
    createAnalyser() { return { fftSize: 512, getByteTimeDomainData: data => data.fill(speaking ? 150 : 128) }; }
    createMediaStreamSource() { return { connect() {} }; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  const flow = setup({ AudioContext });
  try {
    await flow.input.start();
    t.mock.timers.tick(500);
    speaking = false;
    t.mock.timers.tick(1500);
    await flush();
    assert.equal(flow.uploads(), 1);
    assert.deepEqual(flow.transcripts, ['What is GMC?']);
    assert.equal(flow.input.active, false);
  } finally { flow.input.destroy(); }
});


test('mobile audio is unlocked before the permission wait and released before upload', async () => {
  const events = [];
  let grant;
  const permission = new Promise(resolve => { grant = resolve; });
  class AudioContext {
    state = 'running';
    constructor() { events.push('created'); }
    resume() { events.push('resumed'); return Promise.resolve(); }
    createAnalyser() { return { fftSize: 512, getByteTimeDomainData: data => data.fill(150) }; }
    createMediaStreamSource() { return { connect() {} }; }
    close() { events.push('closed'); return Promise.resolve(); }
  }
  const flow = setup({ AudioContext, navigator: { mediaDevices: { getUserMedia: () => { events.push('permission'); return permission; } } } }, {
    onUpload() { events.push('upload'); assert.equal(events.at(-2), 'closed'); },
  });
  try {
    const starting = flow.input.start();
    assert.deepEqual(events, ['created', 'resumed', 'permission']);
    grant(flow.stream); await starting;
    flow.input.stop(); await flush();
    assert.deepEqual(events, ['created', 'resumed', 'permission', 'closed', 'upload']);
    assert.equal(flow.uploads(), 1);
    assert.equal(flow.releases(), 1);
  } finally { flow.input.destroy(); }
});
test('insecure mobile HTTP origin explains why voice is unavailable without asking for permission', async () => {
  let requested = false;
  const flow = setup({ isSecureContext: false, navigator: { mediaDevices: { getUserMedia: async () => { requested = true; } } } });
  try {
    assert.equal(flow.input.supported, false);
    assert.match(flow.input.availabilityMessage, /HTTPS/);
    await flow.input.start();
    assert.equal(requested, false);
    assert.match(flow.errors[0], /HTTPS/);
  } finally { flow.input.destroy(); }
});
