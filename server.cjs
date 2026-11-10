// Shared entry point for local Node hosting and serverless adapters.
// Startup performs no filesystem writes; the application is stateless.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const api = import('./backend/src/server.js');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

async function handler(req, res) {
  try {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end('Invalid URL'); return; }
    if (pathname.startsWith('/api/')) return await (await api).handler(req, res);
    if (!['GET', 'HEAD'].includes(req.method)) return res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const parts = relative.split('/');
    const allowed = relative === 'index.html' || (['guide', 'kiosk', 'exports'].includes(parts[0]) && parts.every(part => part && !part.startsWith('.')) && types[path.extname(relative)]);
    if (!allowed || relative.includes('\\')) return res.writeHead(404).end('Not found');
    const data = await fs.readFile(path.join(__dirname, 'frontend', relative));
    res.writeHead(200, { 'Content-Type': types[path.extname(relative)], 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return res.writeHead(404).end('Not found');
    console.error('[Mindu server]', error.message);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unexpected server error.' }));
  }
}

async function start() {
  await api;
  const initialPort = Number(process.env.PORT || 4321);
  if (!Number.isInteger(initialPort) || initialPort < 1 || initialPort > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const server = http.createServer(handler);
  let port = initialPort;
  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && initialPort === 4321 && port < 4331) {
      console.warn(`Port ${port} is in use; trying ${port + 1}.`);
      server.listen(++port, '0.0.0.0');
      return;
    }
    console.error(error.code === 'EADDRINUSE'
      ? `Port ${port} is already in use. Start on another port: PORT=${port + 1} npm start`
      : `Unable to start Mindu: ${error.message}`);
    process.exitCode = 1;
  });
  server.on('listening', () => console.log(`Mindu available at http://localhost:${port}`));
  server.listen(port, '0.0.0.0');
  return server;
}

if (require.main === module) {
  start().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = handler;
module.exports.start = start;
