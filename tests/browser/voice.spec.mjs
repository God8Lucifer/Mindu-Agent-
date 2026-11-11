import { test, expect } from '@playwright/test';
import { respond } from '../../backend/src/ai.js';

async function openGuide(page, { recognition = false, mp4 = false } = {}) {
  await page.addInitScript(({ recognition, mp4 }) => {
    window.capture = { stopped: 0, recorders: [], recognizers: [], denied: false, bytes: 2000, uploads: [] };
    const originalFetch = window.fetch.bind(window);
    window.fetch = (url, init) => {
      if (url === '/api/transcribe') window.capture.uploads.push({ size: init.body.size, type: init.body.type });
      return originalFetch(url, init);
    };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => {
        if (window.capture.denied) throw new DOMException('Permission denied', 'NotAllowedError');
        return { getTracks: () => [{ stop: () => window.capture.stopped++ }] };
      },
    } });
    // No analyser is supplied in these event mocks. Real silence detection is
    // covered separately; these bytes simulate a nonempty encoded recording.
    window.AudioContext = window.webkitAudioContext = undefined;
    window.MediaRecorder = class {
      static isTypeSupported(type) { return mp4 ? type === 'audio/mp4' : type === 'audio/webm;codecs=opus'; }
      constructor(_, options) { this.mimeType = options?.mimeType || ''; this.state = 'inactive'; window.capture.recorders.push(this); }
      start() { this.state = 'recording'; }
      stop() {
        if (this.state !== 'recording') throw new Error('Already stopped');
        this.state = 'inactive';
        queueMicrotask(() => {
          this.ondataavailable?.({ data: new Blob([new Uint8Array(window.capture.bytes)], { type: this.mimeType }) });
          this.onstop?.();
        });
      }
    };
    window.SpeechRecognition = window.webkitSpeechRecognition = recognition ? class {
      constructor() { window.capture.recognizers.push(this); }
      start() { this.onstart?.(); }
      stop() { queueMicrotask(() => this.onend?.()); }
      abort() { this.onend?.(); }
    } : undefined;
  }, { recognition, mp4 });
  await page.route('**/agent/kiosk/kiosk.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.MinduKiosk = { start() {} };' }));
  await page.goto('/');
  await page.evaluate(() => {
    document.querySelector('#guide').hidden = false;
    window.mountGuide(document.querySelector('#guide'), { wake: false, autoGreet: false, voice: false });
    window.voiceStates = [];
    document.querySelector('#guide').addEventListener('mindu:state', e => window.voiceStates.push(e.detail));
  });
}

async function mockChat(page) {
  const requests = [];
  await page.route('**/api/chat', async route => {
    const data = route.request().postDataJSON();
    requests.push(data);
    // Exercise the real scope/history/context path; only the upstream AI is mocked.
    process.env.OPENAI_API_KEY = 'test-only';
    const result = await respond({ ...data, fetchImpl: async () => ({ ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'GMC connects mindfulness, nature and sustainable growth.', annotations: [{ url: 'https://gmc.bt/', title: 'Official GMC' }] }] }] }) }) });
    await route.fulfill({ json: result });
  });
  return requests;
}
const idle = page => expect(page.locator('.mg-stage')).toHaveAttribute('data-state', 'idle');
async function say(page, text) {
  await page.getByRole('button', { name: 'Speak to GMC', exact: true }).click();
  await expect(page.locator('.mg-stage')).toHaveAttribute('data-state', 'listening');
  await page.evaluate(text => {
    const rec = window.capture.recognizers.at(-1);
    rec.onresult({ results: [[{ transcript: text }]] });
    rec.onspeechend();
    rec.onend(); // Some engines deliver repeated/late events: one message only.
  }, text);
  await idle(page);
}

test('spoken and typed GMC question use the same chat path; follow-up retains history and sources', async ({ page }) => {
  const requests = await mockChat(page);
  await openGuide(page, { recognition: true });
  const question = 'What is GMC?';
  await page.getByRole('textbox', { name: 'Your question' }).fill(question);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await idle(page);
  await say(page, question);
  await say(page, 'Why?');
  await say(page, 'Tell me a joke.');
  expect(requests).toHaveLength(4);
  expect(requests[0].question).toBe(requests[1].question);
  expect(requests[1].history.map(t => t.role)).toEqual(['user', 'assistant']);
  expect(requests[2].history).toHaveLength(4);
  expect(requests.every(r => r.chamberId === 'reception' && r.audience === 'general')).toBe(true);
  await expect(page.locator('.mg-user')).toHaveText([question, question, 'Why?', 'Tell me a joke.']);
  await expect(page.locator('.mg-bot').last()).toContainText('I’m here to help you explore Gelephu Mindfulness City.');
  await expect(page.locator('.mg-sources a')).toHaveCount(3);
});

test('recorded fallback selects the supported MIME type, uploads once, blocks duplicate sends, and restores the microphone', async ({ page }, testInfo) => {
  const requests = await mockChat(page);
  let uploads = 0, release;
  const ready = new Promise(resolve => { release = resolve; });
  await page.route('**/api/transcribe', async route => {
    uploads++;
    expect(route.request().headers()['content-type']).toBe(testInfo.project.name === 'iphone-webkit' ? 'audio/mp4' : 'audio/webm');
    // WebKit does not expose Blob request bodies through its debugging protocol.
    const body = route.request().postDataBuffer();
    if (body) expect(body.length).toBe(2000);
    await ready;
    await route.fulfill({ json: { text: 'What is GMC?' } });
  });
  await openGuide(page, { mp4: testInfo.project.name === 'iphone-webkit' });
  await page.getByRole('button', { name: 'Speak to GMC', exact: true }).click();
  await page.getByRole('button', { name: 'Finish speaking' }).click();
  await expect(page.locator('.mg-status')).toHaveText('Transcribing…');
  await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
  await page.evaluate(() => { window.capture.recorders[0].onstop(); document.querySelector('.mg-input').dispatchEvent(new Event('submit', { cancelable: true })); });
  release();
  await idle(page);
  expect(uploads).toBe(1);
  expect(requests).toHaveLength(1);
  expect(await page.evaluate(() => window.capture.uploads[0].size)).toBe(2000);
  await expect(page.locator('.mg-user')).toHaveText('What is GMC?');
  expect(await page.evaluate(() => window.voiceStates)).toEqual(expect.arrayContaining(['listening', 'transcribing', 'thinking']));
  expect(await page.evaluate(() => window.capture.stopped)).toBeGreaterThan(0);
});

test('permission denial, silent clips and transcription errors offer retry or typing without sending chat', async ({ page }) => {
  const requests = await mockChat(page);
  await openGuide(page);
  await page.evaluate(() => { window.capture.denied = true; });
  await page.getByRole('button', { name: 'Speak to GMC', exact: true }).click();
  await expect(page.locator('.mg-status')).toContainText('Microphone access was denied');
  await expect(page.getByRole('button', { name: 'Type instead' })).toBeVisible();
  await page.evaluate(() => { window.capture.denied = false; window.capture.bytes = 0; });
  await page.getByRole('button', { name: 'Try microphone again' }).click();
  await page.getByRole('button', { name: 'Finish speaking' }).click();
  await expect(page.locator('.mg-status')).toContainText('didn’t hear enough speech');
  await page.route('**/api/transcribe', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.evaluate(() => { window.capture.bytes = 2000; });
  await page.getByRole('button', { name: 'Try microphone again' }).click();
  await page.getByRole('button', { name: 'Finish speaking' }).click();
  await expect(page.locator('.mg-status')).toContainText('couldn’t transcribe');
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Type instead' }).click();
  await expect(page.getByRole('textbox', { name: 'Your question' })).toBeFocused();
  await page.getByRole('textbox', { name: 'Your question' }).fill('What is GMC?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await idle(page);
  expect(requests).toHaveLength(1);
});

test('recognition errors discard partial text and retry uses the recording endpoint', async ({ page }) => {
  const requests = await mockChat(page);
  let uploads = 0;
  await page.route('**/api/transcribe', route => { uploads++; return route.fulfill({ json: { text: 'What is GMC?' } }); });
  await openGuide(page, { recognition: true });
  await page.getByRole('button', { name: 'Speak to GMC', exact: true }).click();
  await page.evaluate(() => {
    const rec = window.capture.recognizers[0];
    rec.onresult({ results: [[{ transcript: 'partial question' }]] });
    rec.onerror({ error: 'network' });
    rec.onend();
  });
  await expect(page.locator('.mg-status')).toContainText('Voice recognition is unavailable');
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Try microphone again' }).click();
  await page.getByRole('button', { name: 'Finish speaking' }).click();
  await idle(page);
  expect(uploads).toBe(1);
  expect(requests).toHaveLength(1);
});


test('page hide cancels capture and ignores late callbacks while allowing capture after return', async ({ page }) => {
  const requests = await mockChat(page);
  await openGuide(page);
  await page.getByRole('button', { name: 'Speak to GMC', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await idle(page);
  await expect(page.locator('.mg-user')).toHaveCount(0);
  await page.route('**/api/transcribe', route => route.fulfill({ json: { text: 'What is GMC?' } }));
  await page.getByRole('button', { name: 'Speak to GMC', exact: true }).click();
  await page.evaluate(() => window.capture.recorders[0].onstop());
  await expect(page.locator('.mg-stage')).toHaveAttribute('data-state', 'listening');
  await page.getByRole('button', { name: 'Finish speaking' }).click();
  await idle(page);
  expect(requests).toHaveLength(1);
});

test('upstream GMC branding, theme toggle and microphone opt-out survive integration', async ({ page }) => {
  const requests = await mockChat(page);
  await openGuide(page, { recognition: true });
  await expect(page.locator('.mg-name')).toContainText('GMC');
  const previousTheme = await page.locator('html').getAttribute('data-theme');
  await page.locator('.ks-theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', previousTheme === 'dark' ? 'light' : 'dark');
  await page.evaluate(() => window.mountGuide(document.querySelector('#guide'), { wake: false, autoGreet: false, voice: false, mic: false }));
  await expect(page.locator('.mg-mic')).toBeHidden();
  await page.getByRole('textbox', { name: 'Your question' }).fill('What is GMC?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await idle(page);
  expect(requests).toHaveLength(1);
  expect(await page.evaluate(() => window.capture.recognizers.length)).toBe(0);
});
