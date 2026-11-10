import * as THREE from 'three';

/**
 * Wall and screen textures, painted on canvases at load time so the map needs
 * no image downloads. Looks are taken from the Experience Centre renders:
 * timber panelling and a checkered feature wall at reception, the forest theatre
 * in Chamber 1, mountains over the valley in Chamber 2, green projections in
 * Chamber 3, the city courtyard in Chamber 4, and stone/marble/wood outside.
 *
 * Textures use world-unit UVs: u = metres along the wall, v = metres up.
 */

export type WallFinish = 'plaster' | 'timber' | 'woodBand' | 'stoneFacade' | 'stone';
export type ScreenArt = 'forest' | 'mountains' | 'sectorGreen' | 'cityLife' | 'checker' | 'sageFabric';

/** Small deterministic PRNG so textures look the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, n: number, colors: string[], maxR: number, alpha: number, r: () => number) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    const rad = r() * maxR + 0.4;
    ctx.beginPath();
    ctx.arc(r() * w, r() * h, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function finish(c: HTMLCanvasElement, metresWide: number, metresTall: number, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / metresWide, 1 / metresTall);
  }
  return t;
}

// ---------------------------------------------------------------- walls ----

function plaster() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#f6f3ec';
  ctx.fillRect(0, 0, 256, 256);
  speckle(ctx, 256, 256, 2200, ['#e9e4d8', '#ffffff', '#ece8df'], 1.2, 0.5, rng(1));
  return finish(c, 2, 2);
}

/** Light vertical timber panels with grain and dark seams. */
function timber() {
  const [c, ctx] = canvas(512, 512);
  const r = rng(2);
  const plank = 64;
  for (let x = 0; x < 512; x += plank) {
    const tone = 0.9 + r() * 0.2;
    ctx.fillStyle = `rgb(${Math.round(201 * tone)}, ${Math.round(154 * tone)}, ${Math.round(104 * tone)})`;
    ctx.fillRect(x, 0, plank, 512);
    // grain
    for (let g = 0; g < 14; g++) {
      ctx.strokeStyle = `rgba(${r() < 0.5 ? '120,78,40' : '230,190,140'}, ${0.12 + r() * 0.15})`;
      ctx.lineWidth = 0.6 + r() * 1.2;
      ctx.beginPath();
      let gx = x + r() * plank;
      ctx.moveTo(gx, 0);
      for (let y = 0; y <= 512; y += 32) {
        gx += (r() - 0.5) * 2.2;
        ctx.lineTo(gx, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(70,40,20,.55)';
    ctx.fillRect(x, 0, 2, 512);
  }
  return finish(c, 2, 2);
}

/** Darker brown wood band (the curved wall around Chamber 2 in the 3D render). */
function woodBand() {
  const [c, ctx] = canvas(512, 256);
  const r = rng(3);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#8a5a36');
  g.addColorStop(1, '#6e4528');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 160; i++) {
    ctx.strokeStyle = `rgba(${r() < 0.5 ? '60,34,16' : '170,115,70'}, ${0.15 + r() * 0.2})`;
    ctx.lineWidth = 0.6 + r();
    ctx.beginPath();
    const x = r() * 512;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (r() - 0.5) * 12, 90, x + (r() - 0.5) * 12, 170, x + (r() - 0.5) * 8, 256);
    ctx.stroke();
  }
  for (let x = 0; x < 512; x += 128) {
    ctx.fillStyle = 'rgba(40,22,10,.5)';
    ctx.fillRect(x, 0, 2, 256);
  }
  return finish(c, 3, 1.6);
}

function stoneBase(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const r = rng(seed);
  ctx.fillStyle = '#9a9b97';
  ctx.fillRect(0, 0, w, h);
  // soft cloudy variation
  for (let i = 0; i < 40; i++) {
    const x = r() * w, y = r() * h, rad = 30 + r() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, r() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(60,60,60,.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  speckle(ctx, w, h, Math.round(w * h / 60), ['#6f706c', '#c3c4c0', '#858680', '#b2b0aa'], 1.3, 0.55, r);
}

/** Plain grey stone slabs. */
function stone() {
  const [c, ctx] = canvas(512, 256);
  stoneBase(ctx, 512, 256, 4);
  ctx.strokeStyle = 'rgba(60,60,58,.35)';
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= 512; x += 170) ctx.strokeRect(x, 0, 170, 256);
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(512, 128);
  ctx.stroke();
  return finish(c, 3, 1.6);
}

/** Stone façade with a timber-framed green marble panel, repeating every 4 m. */
function stoneFacade() {
  const [c, ctx] = canvas(1024, 410);
  stoneBase(ctx, 1024, 410, 5);
  const r = rng(6);
  // wood frame
  const fx = 330, fy = 70, fw = 360, fh = 270;
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(fx - 18, fy - 18, fw + 36, fh + 36);
  // marble
  const g = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
  g.addColorStop(0, '#dfe3dc');
  g.addColorStop(0.5, '#cfd6cd');
  g.addColorStop(1, '#e7e9e3');
  ctx.fillStyle = g;
  ctx.fillRect(fx, fy, fw, fh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(fx, fy, fw, fh);
  ctx.clip();
  for (let i = 0; i < 26; i++) {
    ctx.strokeStyle = `rgba(${r() < 0.6 ? '70,100,80' : '120,120,115'}, ${0.25 + r() * 0.35})`;
    ctx.lineWidth = 0.6 + r() * 2.4;
    ctx.beginPath();
    let x = fx + r() * fw, y = fy - 10;
    ctx.moveTo(x, y);
    while (y < fy + fh + 10) {
      x += (r() - 0.45) * 40;
      y += 14 + r() * 26;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  return finish(c, 4, 1.6);
}

// -------------------------------------------------------------- screens ----

/** Lush forest with wildlife — the 360° theatre in Chamber 1 ("The Vision"). */
function forest() {
  const [c, ctx] = canvas(1536, 256);
  const r = rng(7);
  const W = 1536;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#2f4a2a');
  g.addColorStop(0.5, '#3f6a34');
  g.addColorStop(1, '#22361f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 256);
  // light shafts
  for (let i = 0; i < 7; i++) {
    const x = r() * W;
    const shaft = ctx.createLinearGradient(x, 0, x + 60, 256);
    shaft.addColorStop(0, 'rgba(230,240,190,.22)');
    shaft.addColorStop(1, 'rgba(230,240,190,0)');
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 120, 256); ctx.lineTo(x + 50, 256);
    ctx.fill();
  }
  // distant foliage
  speckle(ctx, W, 200, 2600, ['#4f7d3d', '#5f8f45', '#3a5e30', '#6f9d4f'], 7, 0.55, r);
  // mossy trunks
  for (let i = 0; i < 22; i++) {
    const x = r() * W, w = 10 + r() * 22;
    const t = ctx.createLinearGradient(x, 0, x + w, 0);
    t.addColorStop(0, '#3b3324'); t.addColorStop(0.5, '#6b6a3e'); t.addColorStop(1, '#2c281c');
    ctx.fillStyle = t;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * 1.3, 256); ctx.lineTo(x - w * 0.3, 256);
    ctx.fill();
    ctx.save();
    ctx.translate(x, 0);
    speckle(ctx, w, 256, 40, ['#7fa04a', '#9bb85a'], 2.5, 0.6, r); // moss on the trunk
    ctx.restore();
  }
  // ferns along the floor
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = 200 + r() * 60, len = 18 + r() * 30;
    ctx.strokeStyle = ['#5f9a3f', '#7bb24f', '#4a8235'][Math.floor(r() * 3)];
    ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + k * len * 0.4, y - len, x + k * len * 0.8, y - len * 0.6);
      ctx.stroke();
    }
  }
  // wildlife (stylised silhouettes)
  const tiger = (x: number, y: number) => {
    ctx.fillStyle = '#e07a2a';
    ctx.beginPath(); ctx.ellipse(x, y, 26, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 26, y - 6, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 20, y + 6, 5, 14); ctx.fillRect(x + 14, y + 6, 5, 14);
    ctx.strokeStyle = '#1d140c'; ctx.lineWidth = 2.2;
    for (let k = -18; k <= 16; k += 7) { ctx.beginPath(); ctx.moveTo(x + k, y - 10); ctx.lineTo(x + k + 3, y + 4); ctx.stroke(); }
  };
  const deer = (x: number, y: number) => {
    ctx.fillStyle = '#9a6a3c';
    ctx.beginPath(); ctx.ellipse(x, y, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x + 12, y - 18, 5, 14);
    ctx.beginPath(); ctx.ellipse(x + 17, y - 20, 6, 4, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - 14, y + 4, 3, 14); ctx.fillRect(x + 10, y + 4, 3, 14);
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 16, y - 24); ctx.lineTo(x + 12, y - 34); ctx.moveTo(x + 18, y - 24); ctx.lineTo(x + 24, y - 34); ctx.stroke();
  };
  const redPanda = (x: number, y: number) => {
    ctx.fillStyle = '#c5482a';
    ctx.beginPath(); ctx.ellipse(x, y, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 11, y - 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2e4d0'; ctx.fillRect(x + 12, y - 4, 3, 2);
    ctx.strokeStyle = '#c5482a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.quadraticCurveTo(x - 22, y + 4, x - 20, y + 14); ctx.stroke();
  };
  const bird = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y, 6, 3.5, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 13, y + 5); ctx.lineTo(x - 5, y + 3); ctx.fill();
  };
  tiger(220, 214); tiger(1180, 220);
  deer(560, 205); deer(900, 210); deer(1400, 200);
  redPanda(380, 120); redPanda(1010, 110);
  for (let i = 0; i < 14; i++) bird(r() * W, 30 + r() * 120, ['#3fa0d8', '#e8c13a', '#d9443a', '#ffffff'][Math.floor(r() * 4)]);
  return finish(c, 1, 1, false);
}

/** Blue mountain ridges above a green valley — the Urban Blueprint projection (Chamber 2). */
function mountains() {
  const [c, ctx] = canvas(1024, 256);
  const r = rng(8);
  const sky = ctx.createLinearGradient(0, 0, 0, 140);
  sky.addColorStop(0, '#8fc3e6');
  sky.addColorStop(1, '#e4f1f7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 256);
  // clouds
  for (let i = 0; i < 12; i++) {
    const x = r() * 1024, y = 15 + r() * 50;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + k * 18, y + (r() - 0.5) * 6, 26, 9, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  // ridges, far to near
  const ridges = [['#6d9bc0', 70], ['#4f86ad', 95], ['#3f7a7f', 120], ['#4d8a52', 150]] as const;
  ridges.forEach(([col, base], li) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    let y: number = base;
    for (let x = 0; x <= 1024; x += 16) {
      y += (r() - 0.5) * (26 - li * 4);
      y = Math.max(base - 45, Math.min(base + 25, y));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(1024, 256);
    ctx.fill();
  });
  // valley floor and river
  ctx.fillStyle = '#6f9a4e';
  ctx.fillRect(0, 196, 1024, 60);
  speckle(ctx, 1024, 60, 600, ['#5d8a40', '#86ad5e', '#d9d2c2'], 2, 0.6, r);
  ctx.strokeStyle = 'rgba(220,235,240,.95)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 230);
  for (let x = 0; x <= 1024; x += 40) ctx.lineTo(x, 222 + Math.sin(x / 70) * 12);
  ctx.stroke();
  return finish(c, 1, 1, false);
}

/** Bright green projection with white line icons (Chamber 3). */
function sectorGreen() {
  const [c, ctx] = canvas(1024, 256);
  const r = rng(9);
  ctx.fillStyle = '#4f9a3c';
  ctx.fillRect(0, 0, 1024, 256);
  speckle(ctx, 1024, 256, 3000, ['#3f8a2e', '#66b04f', '#5aa544'], 2.2, 0.6, r);
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const x = 60 + i * 112 + (r() - 0.5) * 30, y = 70 + r() * 110, rad = 22 + r() * 22;
    ctx.beginPath();
    ctx.ellipse(x, y, rad * 1.6, rad, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - rad * 0.5);
    ctx.lineTo(x, y + rad * 0.4);
    ctx.moveTo(x - 8, y - 4);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x + 8, y - 4);
    ctx.stroke();
  }
  return finish(c, 1, 1, false);
}

/** Tree-lined street with people (Chamber 4 panorama). */
function cityLife() {
  const [c, ctx] = canvas(1024, 256);
  const r = rng(10);
  const sky = ctx.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#dfe8e2');
  sky.addColorStop(0.55, '#c7d3c2');
  sky.addColorStop(0.56, '#b7aa94');
  sky.addColorStop(1, '#8d8170');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 256);
  // buildings
  for (let x = 0; x < 1024; x += 70 + r() * 40) {
    ctx.fillStyle = r() < 0.5 ? '#efe6d6' : '#d9cbb2';
    const h = 50 + r() * 40;
    ctx.fillRect(x, 140 - h, 60, h);
    ctx.fillStyle = '#7a3b2a';
    ctx.fillRect(x - 4, 140 - h - 6, 68, 8);
  }
  // trees
  for (let i = 0; i < 16; i++) {
    const x = r() * 1024, base = 160 + r() * 30;
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(x - 4, base - 70, 8, 70);
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = ['#3f6b3a', '#4f7d45', '#5e8b4f'][k % 3];
      ctx.beginPath();
      ctx.arc(x + (r() - 0.5) * 50, base - 80 + (r() - 0.5) * 30, 18 + r() * 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // people
  for (let i = 0; i < 70; i++) {
    const x = r() * 1024, y = 175 + r() * 60;
    ctx.fillStyle = ['#8c2b2b', '#b5523c', '#3d3d55', '#e4c06a', '#6b2d4a'][Math.floor(r() * 5)];
    ctx.fillRect(x, y, 4, 12);
    ctx.fillStyle = '#5b4030';
    ctx.beginPath();
    ctx.arc(x + 2, y - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  return finish(c, 1, 1, false);
}

/** Checkered timber and green-stone feature wall (reception / postcard board). */
function checker() {
  const [c, ctx] = canvas(256, 256);
  const r = rng(11);
  const n = 8, s = 256 / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const green = (x + y) % 2 === 0 && r() < 0.75;
      ctx.fillStyle = green ? ['#6f8f6a', '#7f9d72', '#5f7f5c'][Math.floor(r() * 3)] : ['#c98a4b', '#d79b5c', '#b97b40'][Math.floor(r() * 3)];
      ctx.fillRect(x * s, y * s, s, s);
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(x * s, y * s, s, 3);
      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.fillRect(x * s, y * s + s - 3, s, 3);
    }
  }
  return finish(c, 1.2, 1.2);
}

/** Sage green patterned fabric (reception side wall). */
function sageFabric() {
  const [c, ctx] = canvas(128, 128);
  ctx.fillStyle = '#6f8460';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(220,230,200,.25)';
  ctx.lineWidth = 1.2;
  for (let y = 0; y < 128; y += 16) {
    for (let x = 0; x < 128; x += 16) {
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 6, 0, Math.PI);
      ctx.stroke();
    }
  }
  return finish(c, 0.8, 0.8);
}

// --------------------------------------------------------------- caches ----

const wallMakers: Record<WallFinish, () => THREE.Texture> = { plaster, timber, woodBand, stoneFacade, stone };
const screenMakers: Record<ScreenArt, () => THREE.Texture> = { forest, mountains, sectorGreen, cityLife, checker, sageFabric };
const cache = new Map<string, THREE.Texture>();

export function wallTexture(kind: WallFinish) {
  if (!cache.has(kind)) cache.set(kind, wallMakers[kind]());
  return cache.get(kind)!;
}

export function screenTexture(kind: ScreenArt) {
  const key = `screen:${kind}`;
  if (!cache.has(key)) cache.set(key, screenMakers[kind]());
  return cache.get(key)!;
}

/** The same art as a data URL, for use in DOM holograms. */
export function screenImageURL(kind: ScreenArt) {
  return (screenTexture(kind).image as HTMLCanvasElement).toDataURL('image/jpeg', 0.85);
}
