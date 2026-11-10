import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import handler from '../../server.cjs';

test('shared server serves UI and API and protects private files', async () => {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/', '/guide/gmc-guide.js', '/guide/gmc-guide.css', '/kiosk/kiosk.js', '/exports/gmc-logo-color.svg', '/api/health']) assert.equal((await fetch(base + path)).status, 200);
    for (const path of ['/.env', '/backend/src/server.js', '/package.json', '/guide/%2e%2e%2fbackend/src/server.js']) assert.equal((await fetch(base + path)).status, 404, path);
    assert.equal((await fetch(base + '/%ZZ')).status, 400);
    for (const body of ['null', '[]', '{', '{}']) assert.equal((await fetch(base + '/api/chat', { method: 'POST', body })).status, 400, body);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
