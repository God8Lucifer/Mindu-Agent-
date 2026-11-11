import test from 'node:test';
import assert from 'node:assert/strict';
import { extensionForAudio, transcribeAudio } from '../src/transcribe.js';

test('recognises supported browser recording mime types', () => {
  assert.equal(extensionForAudio('audio/webm;codecs=opus'), 'webm');
  assert.equal(extensionForAudio('audio/mp4'), 'mp4');
  assert.equal(extensionForAudio('audio/unknown'), null);
});

test('rejects transcription without API key', async () => {
  const saved = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(transcribeAudio(Buffer.alloc(2000), 'audio/webm'), e => e.code === 'NO_API_KEY');
  } finally {
    if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
  }
});

test('returns text from successful transcription API response', async () => {
  const key = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = 'fake-test-key';
  global.fetch = async () => ({ ok: true, json: async () => ({ text: 'What is Chamber 2?' }) });
  try {
    assert.equal(await transcribeAudio(Buffer.alloc(2000), 'audio/webm'), 'What is Chamber 2?');
  } finally {
    global.fetch = originalFetch;
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  }
});

test('reports quota failures instead of returning a fake transcript', async () => {
  const key = process.env.OPENAI_API_KEY;
  const originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = 'fake-test-key';
  global.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'Test quota failure' } }) });
  try {
    await assert.rejects(transcribeAudio(Buffer.alloc(2000), 'audio/webm'), e => e.code === 'TRANSCRIPTION_429');
  } finally {
    global.fetch = originalFetch;
    if (key === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = key;
  }
});

test('empty speech is reported as NO_SPEECH and MP4 uses the correct upload extension', async () => {
  const key = process.env.OPENAI_API_KEY, originalFetch = global.fetch;
  process.env.OPENAI_API_KEY = 'test-key';
  global.fetch = async (_, init) => {
    assert.equal(init.body.get('file').name, 'question.mp4');
    return { ok: true, json: async () => ({ text: '   ' }) };
  };
  try { await assert.rejects(transcribeAudio(Buffer.alloc(2000), 'audio/mp4'), e => e.code === 'NO_SPEECH'); }
  finally { global.fetch = originalFetch; if (key === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = key; }
});
