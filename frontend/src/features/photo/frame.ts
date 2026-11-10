import type { Chamber } from './chambers';

/** Every photo is shot at this size (4:5 portrait, good for stories and feeds). */
export const PHOTO_W = 1080;
export const PHOTO_H = 1350;

export const GMC = {
  ink: '#2d3a2b',
  body: '#4a5d43',
  gold: '#c9a961',
  surface: '#f5f1e8',
  plum: '#4a1a2c',
};

let logoPromise: Promise<HTMLImageElement | null> | null = null;

/** The white GMC logo, loaded once and reused for every frame. */
export function loadLogo(): Promise<HTMLImageElement | null> {
  logoPromise ??= new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/gmc-logo-light.svg';
  });
  return logoPromise;
}

export function formatDate(d = new Date()) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Draws the GMC photo frame (top and bottom bands, gold border) over whatever
 * is already on the canvas. The live camera preview and the saved photo use
 * this same function, so what visitors see is exactly what they get.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  info: { chamber: Chamber; shot: number; total: number },
  logo: HTMLImageElement | null,
) {
  const s = w / PHOTO_W; // scale everything from the 1080px design
  ctx.save();

  // Top band
  const topH = 170 * s;
  const top = ctx.createLinearGradient(0, 0, 0, topH);
  top.addColorStop(0, 'rgba(45,58,43,0.92)');
  top.addColorStop(1, 'rgba(45,58,43,0.0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, topH);

  // Bottom band
  const botH = 230 * s;
  const bot = ctx.createLinearGradient(0, h - botH, 0, h);
  bot.addColorStop(0, 'rgba(45,58,43,0.0)');
  bot.addColorStop(0.55, 'rgba(45,58,43,0.85)');
  bot.addColorStop(1, 'rgba(45,58,43,0.96)');
  ctx.fillStyle = bot;
  ctx.fillRect(0, h - botH, w, botH);

  // Gold inset border
  const inset = 28 * s;
  ctx.strokeStyle = GMC.gold;
  ctx.lineWidth = 4 * s;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);

  // Logo + wordmark
  const pad = 60 * s;
  const logoSize = 72 * s;
  if (logo) ctx.drawImage(logo, pad, pad - 6 * s, logoSize, logoSize);
  const textX = pad + (logo ? logoSize + 20 * s : 0);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${22 * s}px ${sans()}`;
  setSpacing(ctx, 5 * s);
  ctx.fillText('GELEPHU MINDFULNESS CITY', textX, pad + 24 * s);
  ctx.fillStyle = GMC.gold;
  ctx.font = `700 ${18 * s}px ${sans()}`;
  setSpacing(ctx, 4 * s);
  ctx.fillText('EXPERIENCE CENTRE', textX, pad + 54 * s);
  setSpacing(ctx, 0);

  // Chamber caption
  const baseY = h - 70 * s;
  ctx.fillStyle = GMC.gold;
  ctx.font = `700 ${22 * s}px ${sans()}`;
  setSpacing(ctx, 5 * s);
  ctx.fillText(`CHAMBER ${info.chamber.number}`, pad, baseY - 62 * s);
  setSpacing(ctx, 0);
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${50 * s}px ${serif()}`;
  ctx.fillText(info.chamber.name, pad, baseY - 8 * s, w - pad * 2 - 120 * s);

  // Shot counter, bottom right
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = `700 ${24 * s}px ${sans()}`;
  ctx.fillText(`${info.shot} / ${info.total}`, w - pad, baseY - 8 * s);
  ctx.textAlign = 'left';

  ctx.restore();
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing is widely supported now; older browsers simply ignore it.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

/** Draws a source (video or image) to fill w×h, cropping the overflow like CSS object-fit: cover. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  x: number, y: number, w: number, h: number,
  mirror = false,
) {
  const scale = Math.max(w / srcW, h / srcH);
  const cw = w / scale;
  const ch = h / scale;
  const sx = (srcW - cw) / 2;
  const sy = (srcH - ch) / 2;
  ctx.save();
  if (mirror) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(src, sx, sy, cw, ch, 0, 0, w, h);
  } else {
    ctx.drawImage(src, sx, sy, cw, ch, x, y, w, h);
  }
  ctx.restore();
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.9) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not save the image'))), type, quality);
  });
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

/**
 * next/font renames Lato and Lora to hashed family names, so canvas text has
 * to read the real names from the CSS variables set in app/layout.tsx.
 */
function cssFont(variable: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  const fam = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return fam ? `${fam}, ${fallback}` : fallback;
}
export const sans = () => cssFont('--font-sans', 'system-ui, sans-serif');
export const serif = () => cssFont('--font-serif', 'Georgia, serif');
