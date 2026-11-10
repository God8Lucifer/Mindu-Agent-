// Dev server for the Mindu agent: `node frontend/agent/serve.js` → http://localhost:4321
// Serves the static UI and forwards /api/* to the GMC AI backend (backend/, port 3001).
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 4321;
const API = new URL(process.env.API_URL || 'http://localhost:3001');
const ROOT = __dirname; // frontend/agent/ — only the agent UI is served
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

function proxy(req, res) {
  const upstream = http.request(
    { hostname: API.hostname, port: API.port, path: req.url, method: req.method, headers: { ...req.headers, host: API.host } },
    (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); }
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'The Mindu AI backend is not running. Start it with: node backend/src/server.js' }));
  });
  req.pipe(upstream);
}

http
  .createServer((req, res) => {
    if (req.url.startsWith('/api/')) return proxy(req, res);
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
    if (!file.startsWith(ROOT) || path.basename(file).startsWith('.')) {
      return res.writeHead(403).end();
    }
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404).end('Not found');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`Mindu guide at http://localhost:${PORT} (API → ${API.origin})`));
