import http from 'node:http';
import { URL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { chambers, welcome, getChamber } from './content.js';
import { respond } from './ai.js';
import { transcribeAudio, extensionForAudio } from './transcribe.js';

// Load root .env automatically, even when started using `npm start` in backend/.
const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '../../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !Object.hasOwn(process.env, m[1])) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
}
const PORT = Number(process.env.PORT || 3001);
const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}
async function handler(req, res) {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'GET' && path === '/api/health') return send(res, 200, {
    ok: true, mode: process.env.OPENAI_API_KEY?.trim() ? 'live-ai' : 'guided-demo', webSearch: process.env.ENABLE_WEB_SEARCH !== 'false', model: process.env.OPENAI_MODEL || 'gpt-4.1-mini'
  });
  if (req.method === 'GET' && path === '/api/content') return send(res, 200, { chambers, welcome });
  if (req.method === 'POST' && path === '/api/transcribe') {
    try {
      const contentType = req.headers['content-type'] || '';
      if (!extensionForAudio(contentType)) return send(res, 415, { error: 'Unsupported audio format.' });
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) return send(res, 413, { error: 'Audio too large. Keep questions short.' });
        chunks.push(chunk);
      }
      const text = await transcribeAudio(Buffer.concat(chunks), contentType);
      return send(res, 200, { text });
    } catch (err) {
      console.error('[Mindu voice]', err.code || 'TRANSCRIPTION_ERROR', err.message);
      return send(res, err.status || 500, { error: err.status ? err.message : 'Unexpected voice processing error.', code: err.code || 'TRANSCRIPTION_ERROR' });
    }
  }
  if (req.method === 'POST' && path === '/api/chat') {
    let body = '';
    try {
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 5000) return send(res, 413, { error: 'Request too large' });
      }
      const input = JSON.parse(body);
      if (!input || typeof input !== 'object' || Array.isArray(input)) return send(res, 400, { error: 'Expected a JSON object.' });
      const question = input?.question;
      if (typeof question !== 'string' || question.trim().length < 2 || question.length > 400) return send(res, 400, { error: 'Question must contain 2–400 characters.' });
      const chamberId = String(input?.chamberId ?? 'reception');
      if (!chambers.some(c => c.id === chamberId)) return send(res, 400, { error: 'Unknown chamber.' });
      const result = await respond({
        question: question.trim(), chamberId,
        history: Array.isArray(input?.history) ? input.history.slice(-8) : [],
        audience: input?.audience === 'student' ? 'student' : 'general'
      });
      return send(res, 200, { ...result, chamber: getChamber(chamberId).name });
    } catch (error) {
      if (error instanceof SyntaxError) return send(res, 400, { error: 'Invalid JSON request.' });
      const status = [400, 503, 504].includes(error.status) ? error.status : 500;
      console.error('[Mindu API]', error.message);
      return send(res, status, { error: status === 500 ? 'Unexpected server error.' : error.message, code: error.code || 'SERVER_ERROR' });
    }
  }
  send(res, 404, { error: 'Not found' });
}
const server = http.createServer(handler);
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.env.NODE_ENV !== 'test') server.listen(PORT, '0.0.0.0', () => {
  console.log(`GMC API listening on ${PORT}; mode=${process.env.OPENAI_API_KEY?.trim() ? 'live-ai' : 'guided-demo'}`);
});
export { server, handler };
