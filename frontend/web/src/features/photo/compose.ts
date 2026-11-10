import { chambers, type Chamber } from './chambers';
import { AI_COVER_TIMEOUT_MS, generateAiCover } from './cover';
import { canvasToBlob, drawCover, formatDate, loadImage, loadLogo, sans, serif } from './frame';

/** The finished collection is a 9:16 story-sized image. */
export const OUT_W = 1080;
export const OUT_H = 1920;
const COVER_H = 780;
const FOOTER_H = 110;
const PAD = 48;

/** Collection colours, taken from the sunset cover photo (public/photo/gmc-cover.webp). */
const SUNSET = {
  paper: '#f7ecdf',     // warm cream, like the haze on the horizon
  paperDeep: '#efd9c2', // peach, like the sky
  amber: '#e0913f',     // glowing windows
  ember: '#c4632f',     // autumn trees
  brown: '#3a2416',     // deep shadows
  night: '#2a190f',
};
const COVER_PHOTO = '/photo/gmc-cover.webp';

export type Collection = { blob: Blob; usedAiCover: boolean };

export async function buildCollection(shots: Record<string, Blob[]>): Promise<Collection> {
  const date = formatDate();
  const done = chambers
    .map(chamber => ({ chamber, photos: shots[chamber.id] ?? [] }))
    .filter(c => c.photos.length > 0);
  if (!done.length) throw new Error('Take some photos first');

  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  await document.fonts?.ready;
  const [logo, aiCover, coverPhoto] = await Promise.all([
    loadLogo(),
    tryAiCover(done, date),
    loadImage(COVER_PHOTO).catch(() => null),
  ]);

  // Background: cream fading to sky-peach towards the footer
  const bg = ctx.createLinearGradient(0, COVER_H, 0, OUT_H);
  bg.addColorStop(0, SUNSET.paper);
  bg.addColorStop(1, SUNSET.paperDeep);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  // Cover
  const coverImg = aiCover ?? coverPhoto;
  if (coverImg) {
    drawCover(ctx, coverImg, coverImg.naturalWidth, coverImg.naturalHeight, 0, 0, OUT_W, COVER_H);
    shadeCover(ctx);
  } else {
    drawTemplateCover(ctx);
  }
  // A thin amber line where the cover meets the page
  ctx.fillStyle = SUNSET.amber;
  ctx.fillRect(0, COVER_H - 4, OUT_W, 4);
  drawCoverText(ctx, logo, done.length, date);

  // Photo grid: one row per chamber, three photos per row.
  const gridTop = COVER_H + 36;
  const gridH = OUT_H - FOOTER_H - gridTop;
  const rows = done.length;
  const labelH = 40;
  const rowGap = 22;
  const colGap = 16;
  const rowH = Math.min(420, (gridH - rowGap * (rows - 1)) / rows);
  let thumbH = rowH - labelH;
  let thumbW = thumbH * 0.8;
  const maxW = (OUT_W - PAD * 2 - colGap * 2) / 3;
  if (thumbW > maxW) { thumbW = maxW; thumbH = thumbW / 0.8; }
  const usedH = rows * (labelH + thumbH) + (rows - 1) * rowGap;
  let y = gridTop + Math.max(0, (gridH - usedH) / 2);
  const rowW = thumbW * 3 + colGap * 2;
  const x0 = (OUT_W - rowW) / 2;

  for (const { chamber, photos } of done) {
    ctx.fillStyle = SUNSET.ember;
    ctx.font = `900 20px ${sans()}`;
    setSpacing(ctx, 4);
    ctx.fillText(`CHAMBER ${chamber.number}`, x0, y + 24);
    const tagW = ctx.measureText(`CHAMBER ${chamber.number}`).width;
    setSpacing(ctx, 0);
    ctx.fillStyle = SUNSET.brown;
    ctx.font = `700 26px ${serif()}`;
    ctx.fillText(chamber.name, x0 + tagW + 18, y + 25, rowW - tagW - 18);

    const ty = y + labelH;
    const imgs = await Promise.all(photos.map(blobToImage));
    imgs.forEach((img, i) => {
      const tx = x0 + i * (thumbW + colGap);
      ctx.save();
      ctx.shadowColor = 'rgba(58,36,22,.28)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#fff';
      roundRect(ctx, tx, ty, thumbW, thumbH, 14);
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, tx, ty, thumbW, thumbH, 14);
      ctx.clip();
      drawCover(ctx, img, img.naturalWidth, img.naturalHeight, tx, ty, thumbW, thumbH);
      ctx.restore();
    });
    y += labelH + thumbH + rowGap;
  }

  // Footer
  ctx.fillStyle = SUNSET.night;
  ctx.fillRect(0, OUT_H - FOOTER_H, OUT_W, FOOTER_H);
  ctx.fillStyle = SUNSET.amber;
  ctx.fillRect(0, OUT_H - FOOTER_H, OUT_W, 4);
  ctx.fillStyle = '#fff';
  ctx.font = `700 24px ${sans()}`;
  ctx.textAlign = 'center';
  setSpacing(ctx, 3);
  ctx.fillText('GELEPHU MINDFULNESS CITY · EXPERIENCE CENTRE', OUT_W / 2, OUT_H - FOOTER_H / 2 + 9);
  setSpacing(ctx, 0);
  ctx.textAlign = 'left';

  return { blob: await canvasToBlob(canvas, 'image/jpeg', 0.9), usedAiCover: !!aiCover };
}

async function tryAiCover(done: { chamber: Chamber; photos: Blob[] }[], date: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AI_COVER_TIMEOUT_MS);
  try {
    const blob = await Promise.race([
      generateAiCover({ chambers: done, date }, ctrl.signal),
      new Promise<null>(resolve => ctrl.signal.addEventListener('abort', () => resolve(null))),
    ]);
    return blob ? await blobToImage(blob) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Darkens the top and bottom of a cover photo so the logo and title stay readable. */
function shadeCover(ctx: CanvasRenderingContext2D) {
  const top = ctx.createLinearGradient(0, 0, 0, 220);
  top.addColorStop(0, 'rgba(42,25,15,.55)');
  top.addColorStop(1, 'rgba(42,25,15,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, OUT_W, 220);
  const bottom = ctx.createLinearGradient(0, COVER_H * 0.58, 0, COVER_H);
  bottom.addColorStop(0, 'rgba(42,25,15,0)');
  bottom.addColorStop(0.5, 'rgba(42,25,15,.6)');
  bottom.addColorStop(1, 'rgba(42,25,15,.92)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, OUT_W, COVER_H);
}

/** Fallback cover if the photo can't load: a sunset gradient with amber rings. */
function drawTemplateCover(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, COVER_H);
  g.addColorStop(0, '#c9a383');
  g.addColorStop(0.55, '#e9b88a');
  g.addColorStop(1, SUNSET.brown);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, OUT_W, COVER_H);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, OUT_W, COVER_H);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,220,180,0.25)';
  ctx.lineWidth = 2;
  for (let r = 60; r < 900; r += 46) {
    ctx.beginPath();
    ctx.arc(OUT_W * 0.86, COVER_H * 0.2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoverText(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, count: number, date: string) {
  if (logo) ctx.drawImage(logo, PAD + 10, PAD + 10, 96, 96);
  ctx.fillStyle = '#ffc58a';
  ctx.font = `900 24px ${sans()}`;
  setSpacing(ctx, 6);
  ctx.fillText('MY EXPERIENCE CENTRE JOURNEY', PAD + 10, COVER_H - 200);
  setSpacing(ctx, 0);
  ctx.fillStyle = '#fff';
  ctx.font = `700 92px ${serif()}`;
  ctx.fillText('My GMC Story', PAD + 6, COVER_H - 104);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.font = `400 30px ${sans()}`;
  ctx.fillText(`${count} of ${chambers.length} chambers · ${date}`, PAD + 10, COVER_H - 52);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

async function blobToImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try { return await loadImage(url); } finally { URL.revokeObjectURL(url); }
}
