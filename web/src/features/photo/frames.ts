import type { Chamber } from './chambers';
import { hand } from './fonts';
import { GMC, PHOTO_W, drawCover, drawFrame, loadLogo, sans, serif } from './frame';

/**
 * Photo frame styles. Each frame says where the photo sits (`photo`), and
 * paints what goes behind it (`back`) and on top of it (`front`). Backs and
 * fronts never depend on the photo, so they are drawn once and cached — the
 * live camera preview only redraws the photo itself each video frame.
 *
 * All sizes are in "design pixels" for a 1080-wide photo; `c.s` scales them.
 */

export type FrameInfo = { chamber: Chamber; shot: number; total: number };
export type Assets = { logo: HTMLImageElement | null; logoDark: HTMLCanvasElement | null };
type Rect = { x: number; y: number; w: number; h: number; r: number };
type C = { ctx: CanvasRenderingContext2D; w: number; h: number; s: number; info: FrameInfo; assets: Assets };

export type FrameDef = {
  id: string;
  name: string;
  photo: (w: number, h: number, s: number) => Rect;
  back?: (c: C, r: Rect) => void;
  /** Runs clipped to the photo, after the photo is drawn (tints, vignettes). */
  effect?: (c: C, r: Rect) => void;
  front: (c: C, r: Rect) => void;
};

const full = (w: number, h: number): Rect => ({ x: 0, y: 0, w, h, r: 0 });

const LUNGTA = ['#2b6cb0', '#f7f5ee', '#c53030', '#2f855a', '#ecc94b'];

export const frames: FrameDef[] = [
  /* ------------------------------------------------------------ classic */
  {
    id: 'classic',
    name: 'Classic',
    photo: full,
    front: c => drawFrame(c.ctx, c.w, c.h, c.info, c.assets.logo),
  },

  /* ----------------------------------------------------------- polaroid */
  {
    id: 'polaroid',
    name: 'Polaroid',
    photo: (w, h, s) => ({ x: 64 * s, y: 64 * s, w: w - 128 * s, h: h - 394 * s, r: 4 * s }),
    back: ({ ctx, w, h }) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#fdfbf6');
      g.addColorStop(1, '#f3eee3');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    front: ({ ctx, w, h, s, info, assets }, r) => {
      ctx.strokeStyle = 'rgba(0,0,0,.08)';
      ctx.lineWidth = 2 * s;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      tape(ctx, 150 * s, 62 * s, 230 * s, 64 * s, -0.62, 'rgba(201,169,97,.78)');
      tape(ctx, w - 150 * s, 62 * s, 230 * s, 64 * s, 0.62, 'rgba(122,160,120,.72)');

      const top = r.y + r.h;
      ctx.save();
      ctx.translate(90 * s, top + 150 * s);
      ctx.rotate(-0.03);
      ctx.fillStyle = GMC.ink;
      ctx.font = `700 ${100 * s}px ${hand()}`;
      ctx.fillText(info.chamber.name, 0, 0, w - 330 * s);
      ctx.restore();

      ctx.fillStyle = '#8a8172';
      ctx.font = `700 ${23 * s}px ${sans()}`;
      spacing(ctx, 4 * s);
      ctx.fillText(`CHAMBER ${info.chamber.number}  ·  ${shortDate().toUpperCase()}  ·  GELEPHU`, 92 * s, h - 74 * s);
      spacing(ctx, 0);
      if (assets.logoDark) ctx.drawImage(assets.logoDark, w - 170 * s, top + 70 * s, 100 * s, 100 * s);
    },
  },

  /* ------------------------------------------------------- prayer flags */
  {
    id: 'flags',
    name: 'Prayer Flags',
    photo: full,
    front: ({ ctx, w, h, s, info, assets }) => {
      let g = ctx.createLinearGradient(0, 0, 0, 300 * s);
      g.addColorStop(0, 'rgba(0,0,0,.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, 300 * s);

      // A string of flags sagging across the top.
      const p0 = { x: -30 * s, y: 60 * s };
      const cp = { x: w / 2, y: 250 * s };
      const p2 = { x: w + 30 * s, y: 130 * s };
      ctx.strokeStyle = '#f3ead7';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(cp.x, cp.y, p2.x, p2.y);
      ctx.stroke();
      const n = 10;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * cp.x + t ** 2 * p2.x;
        const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * cp.y + t ** 2 * p2.y;
        const dx = 2 * (1 - t) * (cp.x - p0.x) + 2 * t * (p2.x - cp.x);
        const dy = 2 * (1 - t) * (cp.y - p0.y) + 2 * t * (p2.y - cp.y);
        const angle = Math.atan2(dy, dx) + Math.sin(i * 1.7) * 0.07;
        const fw = 86 * s;
        const fh = 108 * s;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.shadowColor = 'rgba(0,0,0,.25)';
        ctx.shadowBlur = 8 * s;
        ctx.shadowOffsetY = 3 * s;
        ctx.fillStyle = LUNGTA[i % LUNGTA.length];
        ctx.beginPath();
        // slightly wavy free edge, as if catching the wind
        ctx.moveTo(-fw / 2, 0);
        ctx.lineTo(fw / 2, 0);
        ctx.lineTo(fw / 2, fh);
        ctx.quadraticCurveTo(0, fh + (i % 2 ? 10 : -8) * s, -fw / 2, fh);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = 'rgba(0,0,0,.18)';
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        ctx.arc(0, fh * 0.45, 17 * s, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(-fw * 0.32, fh * (0.75 + k * 0.08));
          ctx.lineTo(fw * 0.32, fh * (0.75 + k * 0.08));
          ctx.stroke();
        }
        ctx.restore();
      }

      g = ctx.createLinearGradient(0, h - 360 * s, 0, h);
      g.addColorStop(0, 'rgba(20,26,19,0)');
      g.addColorStop(1, 'rgba(20,26,19,.88)');
      ctx.fillStyle = g;
      ctx.fillRect(0, h - 360 * s, w, 360 * s);
      ctx.save();
      ctx.translate(60 * s, h - 160 * s);
      ctx.rotate(-0.04);
      ctx.fillStyle = GMC.gold;
      ctx.font = `700 ${84 * s}px ${hand()}`;
      ctx.fillText('Tashi Delek!', 0, 0);
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${50 * s}px ${serif()}`;
      ctx.fillText(info.chamber.name, 62 * s, h - 72 * s, w - 260 * s);
      if (assets.logo) ctx.drawImage(assets.logo, w - 150 * s, h - 160 * s, 90 * s, 90 * s);
    },
  },

  /* --------------------------------------------------------------- film */
  {
    id: 'film',
    name: 'Film Roll',
    photo: (w, h, s) => ({ x: 120 * s, y: 96 * s, w: w - 240 * s, h: h - 192 * s, r: 8 * s }),
    back: ({ ctx, w, h }) => { ctx.fillStyle = '#121212'; ctx.fillRect(0, 0, w, h); },
    effect: ({ ctx, s }, r) => {
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255,150,60,.45)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.globalCompositeOperation = 'source-over';
      const v = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.35, r.x + r.w / 2, r.y + r.h / 2, r.w * 0.85);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,.4)');
      ctx.fillStyle = v;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      void s;
    },
    front: ({ ctx, w, h, s, info, assets }, r) => {
      ctx.fillStyle = '#efe7d6';
      for (const cx of [60 * s, w - 60 * s]) {
        for (let y = 26 * s; y < h; y += 72 * s) {
          ctx.beginPath();
          ctx.roundRect(cx - 22 * s, y, 44 * s, 32 * s, 7 * s);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#f39c3a';
      ctx.font = `900 ${24 * s}px ${sans()}`;
      spacing(ctx, 6 * s);
      ctx.fillText('MINDFUL 400', r.x, 64 * s);
      ctx.textAlign = 'right';
      ctx.fillText(`▸ ${info.shot * 6 + 4}A`, r.x + r.w, 64 * s);
      ctx.fillText(`CHAMBER ${info.chamber.number} · ${info.chamber.name.toUpperCase()}`, r.x + r.w, h - 40 * s, r.w);
      ctx.textAlign = 'left';
      spacing(ctx, 0);

      // Glowing date stamp, like an old point-and-shoot.
      const d = new Date();
      const stamp = `'${String(d.getFullYear()).slice(2)}  ${String(d.getMonth() + 1).padStart(2, ' ')}  ${String(d.getDate()).padStart(2, ' ')}`;
      ctx.save();
      ctx.textAlign = 'right';
      ctx.font = `700 ${44 * s}px ui-monospace, "Courier New", monospace`;
      ctx.shadowColor = '#ff7a00';
      ctx.shadowBlur = 14 * s;
      ctx.fillStyle = '#ffa04d';
      ctx.fillText(stamp, r.x + r.w - 36 * s, r.y + r.h - 40 * s);
      ctx.restore();
      if (assets.logo) {
        ctx.globalAlpha = 0.85;
        ctx.drawImage(assets.logo, r.x + 30 * s, r.y + 30 * s, 70 * s, 70 * s);
        ctx.globalAlpha = 1;
      }
    },
  },

  /* ----------------------------------------------------------- postcard */
  {
    id: 'stamp',
    name: 'Postcard',
    photo: (w, h, s) => ({ x: 106 * s, y: 106 * s, w: w - 212 * s, h: h - 330 * s - 186 * s, r: 0 }),
    back: ({ ctx, w, h, s }) => {
      const kraft = '#e8d8b9';
      ctx.fillStyle = kraft;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(120,90,50,.07)';
      ctx.lineWidth = 2 * s;
      for (let x = -h; x < w; x += 18 * s) {
        ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h, 0); ctx.stroke();
      }
      // White stamp with perforated edges
      const sx = 70 * s, sy = 70 * s, sw = w - 140 * s, sh = h - 330 * s;
      ctx.save();
      ctx.shadowColor = 'rgba(60,40,10,.25)';
      ctx.shadowBlur = 18 * s;
      ctx.shadowOffsetY = 6 * s;
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();
      ctx.fillStyle = kraft;
      const rad = 13 * s, step = 40 * s;
      for (let x = sx + step / 2; x < sx + sw; x += step) {
        circle(ctx, x, sy, rad); circle(ctx, x, sy + sh, rad);
      }
      for (let y = sy + step / 2; y < sy + sh; y += step) {
        circle(ctx, sx, y, rad); circle(ctx, sx + sw, y, rad);
      }
    },
    front: ({ ctx, w, h, s, info, assets }, r) => {
      const base = r.y + r.h;
      ctx.fillStyle = GMC.plum;
      ctx.font = `700 ${56 * s}px ${serif()}`;
      ctx.fillText('BHUTAN', r.x, base + 78 * s);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#7e6230';
      ctx.font = `700 ${44 * s}px ${serif()}`;
      ctx.fillText('Nu. 108', r.x + r.w, base + 76 * s);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#8a8172';
      ctx.font = `700 ${21 * s}px ${sans()}`;
      spacing(ctx, 4 * s);
      ctx.fillText(`CHAMBER ${info.chamber.number} · ${info.chamber.name.toUpperCase()}`, r.x, base + 124 * s, r.w);
      spacing(ctx, 0);

      // Postmark over the photo's corner
      const cx = w - 230 * s, cy = 250 * s, R = 118 * s;
      ctx.save();
      ctx.strokeStyle = 'rgba(35,35,60,.72)';
      ctx.fillStyle = 'rgba(35,35,60,.78)';
      ctx.lineWidth = 6 * s;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.arc(cx, cy, R - 46 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.font = `900 ${21 * s}px ${sans()}`;
      arcText(ctx, 'GELEPHU · MINDFULNESS CITY ·', cx, cy, R - 30 * s, 3.2 * s);
      ctx.textAlign = 'center';
      const d = new Date();
      ctx.font = `900 ${30 * s}px ${sans()}`;
      ctx.fillText(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase(), cx, cy + 2 * s);
      ctx.font = `700 ${22 * s}px ${sans()}`;
      ctx.fillText(String(d.getFullYear()), cx, cy + 30 * s);
      ctx.textAlign = 'left';
      ctx.lineWidth = 5 * s;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        for (let x = 0; x <= 330 * s; x += 6 * s) {
          const px = cx - R - 340 * s + x;
          const py = cy + k * 22 * s + Math.sin(x / (22 * s)) * 9 * s;
          if (x === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(80 * s, h - 110 * s);
      ctx.rotate(-0.03);
      ctx.fillStyle = GMC.plum;
      ctx.font = `700 ${80 * s}px ${hand()}`;
      ctx.fillText('Greetings from Gelephu!', 0, 0, w - 300 * s);
      ctx.restore();
      if (assets.logoDark) ctx.drawImage(assets.logoDark, w - 170 * s, h - 210 * s, 96 * s, 96 * s);
    },
  },

  /* ---------------------------------------------------------------- pop */
  {
    id: 'pop',
    name: 'Pop Sticker',
    photo: (w, h, s) => ({ x: 56 * s, y: 56 * s, w: w - 112 * s, h: h - 266 * s, r: 46 * s }),
    back: ({ ctx, w, h, s }) => {
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(0, 0, w, h);
      const colors = ['#ff5a5f', '#2ec4b6', '#ffffff', '#1f1f1f'];
      let seed = 7;
      const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = colors[i % colors.length];
        circle(ctx, rnd() * w, rnd() * h, (4 + rnd() * 7) * s);
      }
    },
    front: ({ ctx, w, h, s, info, assets }, r) => {
      const ink = '#1f1f1f';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 9 * s;
      ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, r.r); ctx.stroke();

      // "WOW!" starburst
      burst(ctx, 200 * s, r.y + r.h - 110 * s, 140 * s, 108 * s, 14, '#ff5a5f', ink, 7 * s);
      outlinedText(ctx, 'WOW!', 200 * s, r.y + r.h - 92 * s, `900 ${62 * s}px ${sans()}`, '#fff', ink, 8 * s, -0.2);

      // "I ♥ GMC" badge
      ctx.save();
      ctx.translate(w - 180 * s, 180 * s);
      ctx.rotate(0.2);
      ctx.fillStyle = '#2ec4b6';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 7 * s;
      ctx.beginPath(); ctx.arc(0, 0, 110 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      outlinedText(ctx, 'I ♥', 0, -12 * s, `900 ${46 * s}px ${sans()}`, '#fff', ink, 7 * s, 0);
      outlinedText(ctx, 'GMC', 0, 52 * s, `900 ${58 * s}px ${sans()}`, '#fff', ink, 8 * s, 0);
      ctx.restore();

      sparkle(ctx, 360 * s, 130 * s, 40 * s, ink, s);
      sparkle(ctx, w - 120 * s, 430 * s, 28 * s, ink, s);
      sparkle(ctx, w - 330 * s, r.y + r.h - 60 * s, 34 * s, ink, s);

      // Chamber name pill
      const label = info.chamber.name.toUpperCase();
      ctx.font = `900 ${40 * s}px ${sans()}`;
      spacing(ctx, 3 * s);
      const tw = Math.min(ctx.measureText(label).width, w - 480 * s); // stays clear of the logo
      const pw = tw + 90 * s, ph = 96 * s;
      const px = (w - pw) / 2, py = h - 158 * s;
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(label, w / 2, py + ph / 2 + 14 * s, tw);
      ctx.textAlign = 'left';
      spacing(ctx, 0);
      if (assets.logoDark) ctx.drawImage(assets.logoDark, w - 132 * s, h - 150 * s, 80 * s, 80 * s);
    },
  },
];

export const frameById = (id: string) => frames.find(f => f.id === id) ?? frames[0];

/* ------------------------------------------------------------ rendering */

let assetsPromise: Promise<Assets> | null = null;

/** Loads the logo (white + dark versions) and the fonts frames draw with. */
export function prepareFrames(): Promise<Assets> {
  assetsPromise ??= (async () => {
    const logo = await loadLogo();
    await Promise.all([
      document.fonts.load(`700 40px ${hand()}`),
      document.fonts.load(`700 40px ${serif()}`),
      document.fonts.load(`900 40px ${sans()}`),
      document.fonts.load(`700 40px ${sans()}`),
    ]).catch(() => {});
    return { logo, logoDark: logo ? tintImage(logo, GMC.ink) : null };
  })();
  return assetsPromise;
}

const layers = new Map<string, { back: HTMLCanvasElement; front: HTMLCanvasElement }>();

function getLayers(frame: FrameDef, w: number, h: number, info: FrameInfo, assets: Assets) {
  const key = `${frame.id}|${w}x${h}|${info.chamber.id}|${info.shot}`;
  let l = layers.get(key);
  if (!l) {
    if (layers.size > 40) layers.clear();
    const s = w / PHOTO_W;
    const r = frame.photo(w, h, s);
    const make = (paint?: (c: C, r: Rect) => void) => {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d')!;
      paint?.({ ctx, w, h, s, info, assets }, r);
      return cv;
    };
    l = { back: make(frame.back), front: make(frame.front) };
    layers.set(key, l);
  }
  return l;
}

export type PhotoSource = { src: CanvasImageSource; w: number; h: number; mirror?: boolean } | null;

/** Draws a full framed photo. With no source, draws a sample scene (used for previews). */
export function renderFramed(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  frame: FrameDef, info: FrameInfo, assets: Assets, photo: PhotoSource,
) {
  const s = w / PHOTO_W;
  const r = frame.photo(w, h, s);
  const l = getLayers(frame, w, h, info, assets);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(l.back, 0, 0);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, r.r);
  ctx.clip();
  if (photo) drawCover(ctx, photo.src, photo.w, photo.h, r.x, r.y, r.w, r.h, photo.mirror);
  else samplePhoto(ctx, r);
  frame.effect?.({ ctx, w, h, s, info, assets }, r);
  ctx.restore();
  ctx.drawImage(l.front, 0, 0);
}

/* -------------------------------------------------------------- helpers */

function samplePhoto(ctx: CanvasRenderingContext2D, r: Rect) {
  const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  g.addColorStop(0, '#9cc3d9');
  g.addColorStop(0.6, '#d9c9a8');
  g.addColorStop(1, '#7a9a6a');
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const cx = r.x + r.w / 2, u = r.w / 10;
  ctx.fillStyle = 'rgba(45,58,43,.55)';
  ctx.beginPath(); ctx.arc(cx, r.y + r.h * 0.48, u * 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, r.y + r.h * 0.95, u * 3, u * 2.4, 0, Math.PI, 0); ctx.fill();
}

function tintImage(img: HTMLImageElement, color: string) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || 449;
  c.height = img.naturalHeight || 449;
  const x = c.getContext('2d')!;
  x.drawImage(img, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

function spacing(ctx: CanvasRenderingContext2D, px: number) {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function shortDate() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** A strip of washi tape centred on (cx, cy) with torn zig-zag ends. */
function tape(ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number, th: number, angle: number, color: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  const half = len / 2, z = th / 6;
  ctx.beginPath();
  ctx.moveTo(-half, -th / 2);
  ctx.lineTo(half, -th / 2);
  for (let i = 0; i <= 6; i++) ctx.lineTo(half + (i % 2 ? z : 0), -th / 2 + (th * i) / 6);
  ctx.lineTo(-half, th / 2);
  for (let i = 6; i >= 0; i--) ctx.lineTo(-half - (i % 2 ? z : 0), -th / 2 + (th * i) / 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, radius: number, gap: number) {
  const chars = [...text];
  const widths = chars.map(ch => ctx.measureText(ch).width + gap);
  const total = widths.reduce((a, b) => a + b, 0);
  let a = -Math.PI / 2 - total / radius / 2;
  ctx.save();
  ctx.textAlign = 'center';
  chars.forEach((ch, i) => {
    const step = widths[i] / radius;
    a += step / 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += step / 2;
  });
  ctx.restore();
}

function burst(ctx: CanvasRenderingContext2D, cx: number, cy: number, ro: number, ri: number, n: number, fill: string, stroke: string, lw: number) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? ri : ro;
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function outlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, fill: string, stroke: string, lw: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, ink: string, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const rr = i % 2 ? r * 0.28 : r;
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = 4 * s;
  ctx.strokeStyle = ink;
  ctx.lineJoin = 'round';
  ctx.stroke();
}
