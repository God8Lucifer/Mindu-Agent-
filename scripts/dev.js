// `npm run dev`: starts the AI backend (port 3001, internal) and the Next.js app
// (port 3000) together. Open http://localhost:3000 — everything is served there.
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.join(__dirname, '..');
// PORT is for the website; the backend always gets its own internal port.
const API_PORT = process.env.API_PORT || '3001';
const env = { ...process.env, API_URL: `http://localhost:${API_PORT}` };
const backendEnv = { ...env, PORT: API_PORT };

const procs = [
  ['backend', () => spawn(process.execPath, ['backend/src/server.js'], { cwd: root, env: backendEnv, stdio: ['ignore', 'pipe', 'pipe'] })],
  // npm is a .cmd on Windows, so it runs through the shell (fixed command, no user input).
  ['frontend', () => spawn('npm --prefix frontend run dev', { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], shell: true })],
].map(([name, start]) => {
  const p = start();
  const tag = (line) => line && console.log(`[${name}] ${line}`);
  p.stdout.on('data', (d) => String(d).split(/\r?\n/).forEach(tag));
  p.stderr.on('data', (d) => String(d).split(/\r?\n/).forEach(tag));
  p.on('exit', (code) => { console.log(`[${name}] exited (${code})`); stop(code ?? 1); });
  return p;
});

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  procs.forEach((p) => {
    try {
      // On Windows, kill the whole tree (npm → next) or the dev server is left running.
      if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' });
      else p.kill();
    } catch {}
  });
  process.exit(code);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
