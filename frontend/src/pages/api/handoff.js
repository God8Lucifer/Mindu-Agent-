import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import QRCode from 'qrcode';

// Local, single-server kiosk sessions. A deployment with multiple instances
// must replace this map with a shared store before using kiosk confirmations.
const sessions = globalThis.__gmcHandoffs ??= new Map();
const TTL = 10 * 60 * 1000;

function phoneOrigin(req) {
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const origin = new URL(`${protocol}://${req.headers.host}`);
  if (['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)) {
    const addresses = Object.entries(networkInterfaces())
      .filter(([name]) => !/virtual|vmware|vethernet|docker|loopback|vpn/i.test(name))
      .flatMap(([, entries]) => entries || [])
      .filter((entry) => entry.family === 'IPv4' && !entry.internal)
      .map((entry) => entry.address)
      .filter((ip) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
    if (!addresses.length) throw new Error('Connect this computer to Wi-Fi, then retry.');
    origin.hostname = addresses[0];
  }
  return origin;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }

  if (req.method === 'POST' && req.body?.action === 'create') {
    if (sessions.size >= 1000) return res.status(503).json({ error: 'Please try again shortly.' });
    try {
      const id = randomBytes(24).toString('hex');
      const url = new URL('/', phoneOrigin(req));
      url.searchParams.set('mobile', '1');
      url.searchParams.set('handoff', id);
      const svg = await QRCode.toString(url.href, { type: 'svg', margin: 4, errorCorrectionLevel: 'M' });
      sessions.set(id, { claimed: false, connected: false, svg, expiresAt: now + TTL });
      return res.status(201).json({ id, url: url.href, svg });
    } catch (error) {
      return res.status(503).json({ error: error.message });
    }
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (req.method === 'POST' && !['claim', 'complete'].includes(req.body?.action)) {
    return res.status(400).json({ error: 'Unknown action.' });
  }
  const id = req.method === 'GET' ? req.query.id : req.body?.id;
  if (typeof id !== 'string' || !/^[a-f0-9]{48}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid handoff.' });
  }
  const session = sessions.get(id);
  if (!session) return res.status(410).json({ error: 'This QR has expired. Scan the current kiosk code.' });
  if (req.method === 'POST' && req.body.action === 'claim') session.claimed = true;
  if (req.method === 'POST' && req.body.action === 'complete') {
    if (!session.claimed) return res.status(409).json({ error: 'The phone has not connected yet.' });
    session.connected = true;
  }
  return res.status(200).json({
    claimed: session.claimed,
    connected: session.connected === true,
    ...(req.method === 'POST' && req.body.action === 'claim' ? { svg: session.svg } : {}),
  });
}
