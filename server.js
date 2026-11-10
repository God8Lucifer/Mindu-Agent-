const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'visits.json');
fs.mkdirSync(dataDir, { recursive: true });
let visits = {};
try { visits = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch { /* first run */ }

function save() { fs.writeFileSync(dataFile, JSON.stringify(visits, null, 2)); }
function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 20000) throw new Error('Request too large');
  }
  return JSON.parse(raw || '{}');
}
function publicVisit(visit) {
  return {
    code: visit.code, name: visit.name, interests: visit.interests,
    purpose: visit.purpose, currentRoom: visit.currentRoom,
    visitedRooms: visit.visitedRooms, reflection: visit.reflection,
    questions: visit.questions
  };
}
const rooms = ['vision', 'blueprint', 'economy', 'future'];
const content = {
  vision: 'This chamber introduces the vision for Gelephu Mindfulness City through an immersive experience.',
  blueprint: 'This chamber explores the urban blueprint and how the city is planned.',
  economy: 'This chamber introduces GMC’s eight economic sectors and emerging opportunities.',
  future: 'This chamber invites you to imagine daily life in the future city.'
};
function demoReply(visit, question) {
  const focus = visit.interests.length ? visit.interests.join(' and ') : 'GMC';
  const room = visit.currentRoom || 'vision';
  return `${content[room]} Because you’re interested in ${focus}, I’d start with what this part of the story could mean for you. Your question was: “${question}”\n\nThis is a scripted prototype response. A later AI version should answer using approved GMC material and cite its source.`;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/visits' && req.method === 'POST') {
      const input = await body(req);
      const name = String(input.name || '').trim().slice(0, 40);
      const purpose = String(input.purpose || '').trim().slice(0, 40);
      const interests = Array.isArray(input.interests)
        ? input.interests.map(x => String(x).slice(0, 40)).slice(0, 4) : [];
      if (!name || !purpose || !interests.length) return json(res, 400, { error: 'Complete all booking answers.' });
      const code = crypto.randomBytes(9).toString('base64url').toUpperCase();
      const visit = { code, name, purpose, interests, currentRoom: null, visitedRooms: [], reflection: '', questions: [] };
      visits[code] = visit;
      save();
      return json(res, 201, publicVisit(visit));
    }
    const match = url.pathname.match(/^\/api\/visits\/([A-Z0-9_-]+)(?:\/(room|chat|reflection|questions))?$/i);
    if (match) {
      const visit = visits[match[1].toUpperCase()];
      if (!visit) return json(res, 404, { error: 'Ticket not found.' });
      if (req.method === 'GET' && !match[2]) return json(res, 200, publicVisit(visit));
      if (req.method === 'POST' && match[2] === 'room') {
        const input = await body(req);
        if (!rooms.includes(input.room)) return json(res, 400, { error: 'Unknown chamber.' });
        visit.currentRoom = input.room;
        if (!visit.visitedRooms.includes(input.room)) visit.visitedRooms.push(input.room);
        save();
        return json(res, 200, publicVisit(visit));
      }
      if (req.method === 'POST' && match[2] === 'chat') {
        const input = await body(req);
        const question = String(input.question || '').trim().slice(0, 500);
        if (!question) return json(res, 400, { error: 'Ask a question first.' });
        return json(res, 200, { reply: demoReply(visit, question) });
      }
      if (req.method === 'POST' && match[2] === 'reflection') {
        const input = await body(req);
        visit.reflection = String(input.reflection || '').trim().slice(0, 180);
        save();
        return json(res, 200, publicVisit(visit));
      }
      if (req.method === 'POST' && match[2] === 'questions') {
        const input = await body(req);
        const question = String(input.question || '').trim().slice(0, 500);
        if (!question) return json(res, 400, { error: 'Write a question first.' });
        visit.questions.push({ text: question, at: new Date().toISOString() });
        save();
        return json(res, 201, { received: true });
      }
      return json(res, 405, { error: 'Method not allowed.' });
    }
    const filePath = path.join(publicDir, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!filePath.startsWith(publicDir + path.sep) && filePath !== path.join(publicDir, 'index.html')) {
      return json(res, 403, { error: 'Forbidden.' });
    }
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': `${types[path.extname(filePath)] || 'application/octet-stream'}; charset=utf-8` });
    res.end(data);
  } catch (error) {
    json(res, error.code === 'ENOENT' ? 404 : 400, { error: error.code === 'ENOENT' ? 'Not found.' : error.message });
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Mindu prototype: http://localhost:${port}`));
