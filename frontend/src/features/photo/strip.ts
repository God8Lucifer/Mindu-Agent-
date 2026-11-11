import type { Chamber } from './chambers';
import { canvasToBlob, drawCover, formatDate, loadImage, loadLogo, sans, serif } from './frame';

/**
 * "Save chamber": one chamber's photos on a single 4:5 card (1080×1350), in the
 * same warm palette as the full collection (compose.ts). Layout: the first photo
 * large on the left, the other two stacked on the right.
 */
const W = 1080;
const H = 1350;
const PAD = 48;
const C = {
  paper: '#f7ecdf',
  paperDeep: '#efd9c2',
  ink: '#3a2416',
  muted: '#7a5a44',
  amber: '#e0913f',
};

export async function buildChamberCard(chamber: Chamber, photos: Blob[]): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  await document.fonts?.ready;
  const urls = photos.map(b => URL.createObjectURL(b));
  try {
    const [logo, ...imgs] = await Promise.all([loadLogo(), ...urls.map(u => loadImage(u))]);

    // Paper background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.paper);
    bg.addColorStop(1, C.paperDeep);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Header: logo tile, city name, chamber
    const tile = 84;
    ctx.fillStyle = C.ink;
    roundRect(ctx, PAD, PAD, tile, tile, 18);
    ctx.fill();
    if (logo) ctx.drawImage(logo, PAD + 12, PAD + 12, tile - 24, tile - 24);

    const tx = PAD + tile + 24;
    ctx.fillStyle = C.muted;
    ctx.font = `700 22px ${sans()}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('GELEPHU MINDFULNESS CITY', tx, PAD + 34);
    ctx.fillStyle = C.amber;
    ctx.fillText(`CHAMBER ${chamber.number}`, tx, PAD + 70);

    ctx.fillStyle = C.ink;
    ctx.font = `700 64px ${serif()}`;
    fitText(ctx, chamber.name, PAD, PAD + tile + 92, W - PAD * 2, 64, serif());

    // Photos: one large, two stacked
    const top = PAD + tile + 140;
    const gap = 20;
    const areaH = H - top - 130;
    const bigW = Math.round((W - PAD * 2 - gap) * 0.64);
    const smallW = W - PAD * 2 - gap - bigW;
    const smallH = (areaH - gap) / 2;
    const slots = [
      { x: PAD, y: top, w: bigW, h: areaH },
      { x: PAD + bigW + gap, y: top, w: smallW, h: smallH },
      { x: PAD + bigW + gap, y: top + smallH + gap, w: smallW, h: smallH },
    ];
    slots.forEach((s, i) => {
      const img = imgs[i];
      ctx.save();
      roundRect(ctx, s.x, s.y, s.w, s.h, 20);
      ctx.clip();
      if (img) drawCover(ctx, img, img.naturalWidth, img.naturalHeight, s.x, s.y, s.w, s.h);
      else { ctx.fillStyle = C.paperDeep; ctx.fillRect(s.x, s.y, s.w, s.h); }
      ctx.restore();
    });

    // Footer
    ctx.fillStyle = C.amber;
    ctx.fillRect(PAD, H - 96, 56, 4);
    ctx.fillStyle = C.ink;
    ctx.font = `700 26px ${sans()}`;
    ctx.fillText('GMC Experience Centre', PAD, H - 54);
    ctx.fillStyle = C.muted;
    ctx.font = `400 24px ${sans()}`;
    const date = formatDate();
    ctx.fillText(date, W - PAD - ctx.measureText(date).width, H - 54);

    return await canvasToBlob(canvas);
  } finally {
    urls.forEach(u => URL.revokeObjectURL(u));
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Writes one line, shrinking the font until it fits the width. */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, family: string) {
  let s = size;
  ctx.font = `700 ${s}px ${family}`;
  while (s > 28 && ctx.measureText(text).width > maxW) {
    s -= 2;
    ctx.font = `700 ${s}px ${family}`;
  }
  ctx.fillText(text, x, y);
}
