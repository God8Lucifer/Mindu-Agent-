// Compatibility command; Next.js now hosts both the UI and AI API.
const { spawn } = require('node:child_process');
const path = require('node:path');
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', 'frontend'], {
  cwd: path.resolve(__dirname, '..'), stdio: 'inherit', env: process.env,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
