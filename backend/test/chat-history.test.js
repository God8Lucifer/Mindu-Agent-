import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { handler } from '../src/server.js';

async function request(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.url = '/api/chat'; req.method = 'POST'; req.headers = {};
  let status, result;
  await handler(req, { writeHead(code) { status = code; }, end(data) { result = JSON.parse(data); } });
  return { status, result };
}
test('chat accepts the full bounded conversation, including multibyte text, and still rejects oversized bodies', async () => {
  const saved = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = '';
  try {
    const history = Array.from({ length: 8 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: '城'.repeat(index % 2 ? 2400 : 400) }));
    const accepted = await request({ question: 'What is GMC?', chamberId: 'reception', history });
    assert.equal(accepted.status, 200);
    assert.equal(typeof accepted.result.answer, 'string');
    const oversized = await request({ question: 'What is GMC?', history: 'x'.repeat(65 * 1024) });
    assert.equal(oversized.status, 413);
  } finally { if (saved === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = saved; }
});
