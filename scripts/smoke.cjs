const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

async function main() {
  const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', 'frontend', '--port', '0'], {
    env: { ...process.env, OPENAI_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 15000);
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited: ${code}`)); });
      let output = '';
      child.stderr.on('data', data => process.stderr.write(data));
      child.stdout.on('data', data => {
        output += data;
        const match = output.match(/http:\/\/localhost:(\d+)/);
        if (match && /Ready/.test(output)) { clearTimeout(timeout); resolve(match[0]); }
      });
    });
    for (const route of ['/', '/map', '/photo', '/agent/guide/gmc-guide.js', '/agent/kiosk/kiosk.css', '/api/health', '/api/content']) {
      assert.equal((await fetch(base + route)).status, 200, route);
    }
    const health = await (await fetch(base + '/api/health')).json();
    assert.equal(health.mode, 'guided-demo');
    const answer = await fetch(base + '/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'What is GMC?' }),
    });
    assert.equal(answer.status, 200);
    assert.equal(typeof (await answer.json()).answer, 'string');
    for (const body of ['null', '[]', '{', '{}']) {
      assert.equal((await fetch(base + '/api/chat', { method: 'POST', body })).status, 400, body);
    }
    assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/unknown' }, body: 'audio' })).status, 415);
    console.log('Production smoke checks passed: pages, assets, health, chat, validation, and audio.');
  } finally {
    child.kill('SIGTERM');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
