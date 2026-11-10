const { mkdirSync, copyFileSync, cpSync } = require('node:fs');
const { resolve } = require('node:path');
const root = resolve(__dirname, '..');
const frontend = resolve(root, 'frontend');
const out = resolve(root, 'dist');
mkdirSync(out, { recursive: true });
copyFileSync(resolve(frontend, 'index.html'), resolve(out, 'index.html'));
for (const directory of ['guide', 'kiosk', 'exports']) {
  cpSync(resolve(frontend, directory), resolve(out, directory), { recursive: true });
}
