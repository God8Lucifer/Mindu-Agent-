'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { sceneTheme as T } from './theme';

/**
 * The town around the Experience Centre: ChoeGo GMC sits on its own block in
 * Gelephu town, with roads on every side, rounded street corners, footpaths with
 * black-and-white kerbs, small trees and street lamps, zebra crossings, and
 * traditional neighbouring buildings (white or pastel walls, wooden cornice, wide
 * roof). The foothills rise behind, under a day sky or a starry night sky where
 * the neighbours' windows glow. Shown on a base, like an architect's model.
 *
 * World units: the building spans roughly x −33…34, z −27…27 (see geometry.ts);
 * the entrance is on the east side (≈ 30, 8), the exit north-east (≈ 30, −21).
 * Everything is low-poly and instanced so the map stays fast on phones, and none of
 * it casts shadows or takes clicks (clicks fall through to the ground plane).
 */

// ---------- layout ----------
const BASE = { x0: -135, x1: 135, z0: -112, z1: 112, r: 18, top: -0.36, depth: 2.6 };
/** The ChoeGo GMC plot, its footpath, and the roads around it. */
const PLOT = { x0: -41, x1: 42, z0: -34, z1: 34, r: 8 };
const FOOT = 4; // footpath width around the plot
const ROAD = 12; // road width
const RING = { x0: PLOT.x0 - FOOT, x1: PLOT.x1 + FOOT, z0: PLOT.z0 - FOOT, z1: PLOT.z1 + FOOT }; // outer edge of our footpath
/** Road centre lines: two running north–south (west and east), two east–west (north and south). */
const ROADS_NS = [RING.x0 - ROAD / 2, RING.x1 + ROAD / 2];
const ROADS_EW = [RING.z0 - ROAD / 2, RING.z1 + ROAD / 2];

// Layer heights (all below the building floors, which start at y = −0.3)
const Y_ASPHALT = BASE.top + 0.005;
const Y_FOOT = BASE.top + 0.012;
const Y_PLOT = BASE.top + 0.02;
const Y_PAINT = BASE.top + 0.016;

function cornerOut(x: number, z: number, margin: number) {
  const r = BASE.r;
  const cx = x < BASE.x0 + r ? BASE.x0 + r : x > BASE.x1 - r ? BASE.x1 - r : null;
  const cz = z < BASE.z0 + r ? BASE.z0 + r : z > BASE.z1 - r ? BASE.z1 - r : null;
  return cx !== null && cz !== null && Math.hypot(x - cx, z - cz) > r - margin;
}
const insideBase = (x: number, z: number, margin = 0) =>
  x > BASE.x0 + margin && x < BASE.x1 - margin && z > BASE.z0 + margin && z < BASE.z1 - margin && !cornerOut(x, z, margin);
const onRoad = (x: number, z: number, pad = 0) =>
  ROADS_NS.some(c => Math.abs(x - c) < ROAD / 2 + pad) || ROADS_EW.some(c => Math.abs(z - c) < ROAD / 2 + pad);

/** Small seeded random, so the town looks the same on every visit. */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounded rectangle as a THREE.Shape in shape space (y = −world z, as in geometry.ts). */
function roundedRect(x0: number, z0: number, x1: number, z1: number, r: number) {
  const s = new THREE.Shape();
  const [a, b, c, d] = [x0, -z1, x1, -z0]; // shape-space bounds: left, bottom, right, top
  s.moveTo(a + r, b);
  s.lineTo(c - r, b);
  s.quadraticCurveTo(c, b, c, b + r);
  s.lineTo(c, d - r);
  s.quadraticCurveTo(c, d, c - r, d);
  s.lineTo(a + r, d);
  s.quadraticCurveTo(a, d, a, d - r);
  s.lineTo(a, b + r);
  s.quadraticCurveTo(a, b, a + r, b);
  return s;
}
function flat(shape: THREE.Shape, y: number) {
  const g = new THREE.ShapeGeometry(shape, 8);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}

/** Instanced boxes from a list (position, size, optional colour and y-rotation). */
type Box = { x: number; y: number; z: number; w: number; h: number; d: number; c?: string; ry?: number };
function Boxes({ boxes, color, basic = false }: { boxes: Box[]; color?: string; basic?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    boxes.forEach((b, i) => {
      o.position.set(b.x, b.y, b.z);
      o.rotation.set(0, b.ry ?? 0, 0);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      if (b.c) m.setColorAt(i, col.set(b.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [boxes]);
  if (!boxes.length) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, boxes.length]}>
      <boxGeometry />
      {basic ? <meshBasicMaterial color={color} /> : <meshStandardMaterial color={color} />}
    </instancedMesh>
  );
}

export function Surroundings() {
  return (
    <group>
      <Sky />
      <Hills radius={190} min={16} max={40} seed={7} color={T.hillNear} />
      <Hills radius={228} min={28} max={64} seed={21} color={T.hillFar} />
      <Base />
      <Streets />
      <Kerbs />
      <Neighbours />
      <Cars />
      <Trees />
      <Lamps />
    </group>
  );
}

// ---------- sky ----------
/** Small enough to stay within the camera's far plane (500) from any allowed camera position. */
const SKY_R = 330;

function Sky() {
  const geometry = useMemo(() => {
    const g = new THREE.SphereGeometry(SKY_R, 32, 16);
    const top = new THREE.Color(T.skyTop);
    const horizon = new THREE.Color(T.horizon);
    const pos = g.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, pos.getY(i) / SKY_R); // 0 at the horizon, 1 overhead
      c.copy(horizon).lerp(top, Math.pow(h, 0.6));
      c.toArray(colors, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  const stars = useMemo(() => {
    if (!T.stars) return null;
    const r = rng(3);
    const pts: number[] = [];
    for (let i = 0; i < 420; i++) {
      const az = r() * Math.PI * 2;
      const el = 0.14 + r() * 1.35; // above the hills
      const d = SKY_R - 15;
      pts.push(d * Math.cos(el) * Math.cos(az), d * Math.sin(el), d * Math.cos(el) * Math.sin(az));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <>
      <mesh geometry={geometry} renderOrder={-2}>
        <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      {stars && (
        <points geometry={stars} renderOrder={-1}>
          <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} fog={false} transparent opacity={0.75} depthWrite={false} />
        </points>
      )}
    </>
  );
}

// ---------- foothills: a ring of ridges around the horizon ----------
function Hills({ radius, min, max, seed, color }: { radius: number; min: number; max: number; seed: number; color: string }) {
  const geometry = useMemo(() => {
    const r = rng(seed);
    const phases = [r() * 6, r() * 6, r() * 6];
    const steps = 140;
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const n = 0.5 + 0.5 * (0.55 * Math.sin(a * 3 + phases[0]) + 0.3 * Math.sin(a * 7 + phases[1]) + 0.15 * Math.sin(a * 17 + phases[2]));
      const h = min + (max - min) * n;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      pos.push(x, -4, z, x * 0.97, h, z * 0.97);
      if (i < steps) {
        const b = i * 2;
        idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  }, [radius, min, max, seed]);
  return (
    <mesh geometry={geometry}>
      {/* Not fogged: the scene fog would wash them out; their colours already read as distant. */}
      <meshBasicMaterial color={color} side={THREE.DoubleSide} fog={false} />
    </mesh>
  );
}

// ---------- the model's base: town ground on top, earth on the sides ----------
function Base() {
  const geometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(roundedRect(BASE.x0, BASE.z0, BASE.x1, BASE.z1, BASE.r), { depth: BASE.depth, bevelEnabled: false, curveSegments: 10 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, BASE.top - BASE.depth, 0);
    return g;
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial attach="material-0" color={T.townGround} />
      <meshStandardMaterial attach="material-1" color={T.baseSide} />
    </mesh>
  );
}

// ---------- roads, our footpath and plot, centre lines, zebra crossings ----------
function Streets() {
  const { asphalt, foot, plot } = useMemo(() => {
    const strips: THREE.BufferGeometry[] = [];
    // North–south and east–west roads across the whole base
    ROADS_NS.forEach(c => strips.push(flat(roundedRect(c - ROAD / 2, BASE.z0 + 2, c + ROAD / 2, BASE.z1 - 2, 0.01), Y_ASPHALT)));
    ROADS_EW.forEach(c => strips.push(flat(roundedRect(BASE.x0 + 2, c - ROAD / 2, BASE.x1 - 2, c + ROAD / 2, 0.01), Y_ASPHALT)));
    // The road ring round our block, with rounded corners (the curve seen at the ChoeGo GMC corner)
    strips.push(flat(roundedRect(RING.x0 - ROAD, RING.z0 - ROAD, RING.x1 + ROAD, RING.z1 + ROAD, PLOT.r + FOOT + ROAD), Y_ASPHALT));
    return {
      asphalt: strips,
      foot: flat(roundedRect(RING.x0, RING.z0, RING.x1, RING.z1, PLOT.r + FOOT), Y_FOOT),
      plot: flat(roundedRect(PLOT.x0, PLOT.z0, PLOT.x1, PLOT.z1, PLOT.r), Y_PLOT),
    };
  }, []);

  // Dashed centre lines, leaving the junctions clear
  const dashes = useMemo(() => {
    const out: Box[] = [];
    ROADS_NS.forEach(c => {
      for (let z = BASE.z0 + 6; z < BASE.z1 - 6; z += 6) {
        if (ROADS_EW.some(e => Math.abs(z - e) < ROAD / 2 + 3)) continue;
        out.push({ x: c, y: Y_PAINT, z, w: 0.35, h: 0.02, d: 3 });
      }
    });
    ROADS_EW.forEach(c => {
      for (let x = BASE.x0 + 6; x < BASE.x1 - 6; x += 6) {
        if (ROADS_NS.some(n => Math.abs(x - n) < ROAD / 2 + 3)) continue;
        out.push({ x, y: Y_PAINT, z: c, w: 3, h: 0.02, d: 0.35 });
      }
    });
    return out.filter(b => insideBase(b.x, b.z, 3));
  }, []);

  // Zebra crossings across each road, just outside every junction round our block
  const zebras = useMemo(() => {
    const out: Box[] = [];
    const off = ROAD / 2 + 4;
    ROADS_NS.forEach(nx => ROADS_EW.forEach(ez => {
      [-1, 1].forEach(side => {
        // across the north–south road
        for (let k = -2; k <= 2; k++) out.push({ x: nx + k * 2.2, y: Y_PAINT, z: ez + side * off, w: 1.1, h: 0.02, d: 3.6 });
        // across the east–west road
        for (let k = -2; k <= 2; k++) out.push({ x: nx + side * off, y: Y_PAINT, z: ez + k * 2.2, w: 3.6, h: 0.02, d: 1.1 });
      });
    }));
    return out;
  }, []);

  return (
    <group>
      {asphalt.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={T.asphalt} />
        </mesh>
      ))}
      <mesh geometry={foot}>
        <meshStandardMaterial color={T.footpath} />
      </mesh>
      <mesh geometry={plot}>
        <meshStandardMaterial color={T.plot} />
      </mesh>
      <Boxes boxes={dashes} color={T.paint} />
      <Boxes boxes={zebras} color={T.paint} />
    </group>
  );
}

// ---------- black-and-white kerbs along our footpath ----------
function Kerbs() {
  const boxes = useMemo(() => {
    const shape = roundedRect(RING.x0, RING.z0, RING.x1, RING.z1, PLOT.r + FOOT);
    const pts = shape.getSpacedPoints(Math.round(shape.getLength() / 1.5));
    const out: Box[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      // shape space → world: x stays, z = −y
      const ax = pts[i].x, az = -pts[i].y, bx = pts[i + 1].x, bz = -pts[i + 1].y;
      out.push({
        x: (ax + bx) / 2, y: Y_FOOT + 0.14, z: (az + bz) / 2,
        w: Math.hypot(bx - ax, bz - az) * 0.98, h: 0.28, d: 0.45,
        ry: -Math.atan2(bz - az, bx - ax),
        c: T.kerb[i % 2],
      });
    }
    return out;
  }, []);
  return <Boxes boxes={boxes} />;
}

// ---------- neighbouring buildings ----------
type Lot = { x: number; z: number; w: number; d: number; floors: number; wall: string; roof: string };
const FLOOR_H = 3;

function makeLots(): Lot[] {
  const r = rng(42);
  const lots: Lot[] = [];
  const pick = (a: string[]) => a[Math.floor(r() * a.length)];
  const add = (x: number, z: number, w: number, d: number, maxFloors: number) => {
    if (!insideBase(x - w / 2, z - d / 2, 4) || !insideBase(x + w / 2, z + d / 2, 4)) return;
    if (!insideBase(x - w / 2, z + d / 2, 4) || !insideBase(x + w / 2, z - d / 2, 4)) return;
    if (ROADS_NS.some(c => Math.abs(x - c) < ROAD / 2 + w / 2 + 2) || ROADS_EW.some(c => Math.abs(z - c) < ROAD / 2 + d / 2 + 2)) return;
    if (lots.some(l => Math.abs(l.x - x) < (l.w + w) / 2 + 2.5 && Math.abs(l.z - z) < (l.d + d) / 2 + 2.5)) return;
    lots.push({ x, z, w, d, floors: 2 + Math.floor(r() * (maxFloors - 1)), wall: pick(T.walls), roof: pick(T.roofs) });
  };
  const front = ROAD / 2 + 4; // half the road plus a footpath
  // Two rows of buildings facing each road, away from our block. The default camera
  // looks from the south-east, so buildings on those sides stay low and never hide
  // the Experience Centre; the taller ones stand behind it (north and west).
  for (const row of [0, 1]) {
    const setback = front + (row ? 22 : 0);
    const tall = row ? 3 : 5;
    const low = row ? 2 : 3;
    for (let x = BASE.x0 + 12; x < BASE.x1 - 12;) {
      const w = 11 + r() * 7;
      const d = 10 + r() * 4;
      add(x, ROADS_EW[0] - setback - d / 2, w, d, tall); // north of the north road
      add(x, ROADS_EW[1] + setback + d / 2, w, d, low); // south of the south road
      x += w + 3 + r() * 3;
    }
    for (let z = BASE.z0 + 12; z < BASE.z1 - 12;) {
      const d = 11 + r() * 7;
      const w = 10 + r() * 4;
      add(ROADS_NS[0] - setback - w / 2, z, w, d, tall); // west of the west road
      add(ROADS_NS[1] + setback + w / 2, z, w, d, low); // east of the east road
      z += d + 3 + r() * 3;
    }
  }
  return lots;
}

function Neighbours() {
  const parts = useMemo(() => {
    const bodies: Box[] = [];
    const cornices: Box[] = [];
    const roofs: Box[] = [];
    const ridges: Box[] = [];
    const windows: Box[] = [];
    makeLots().forEach(l => {
      const h = l.floors * FLOOR_H;
      bodies.push({ x: l.x, y: BASE.top + h / 2, z: l.z, w: l.w, h, d: l.d, c: l.wall });
      // wooden cornice under the roof, the traditional Bhutanese band
      cornices.push({ x: l.x, y: BASE.top + h - 0.35, z: l.z, w: l.w + 0.7, h: 0.7, d: l.d + 0.7 });
      // wide overhanging roof with a raised ridge
      roofs.push({ x: l.x, y: BASE.top + h + 0.3, z: l.z, w: l.w + 3, h: 0.6, d: l.d + 3, c: l.roof });
      ridges.push({ x: l.x, y: BASE.top + h + 1.1, z: l.z, w: l.w * 0.62, h: 1.1, d: l.d * 0.62, c: l.roof });
      // a band of windows on every floor (they glow at night)
      for (let f = 0; f < l.floors; f++) {
        windows.push({ x: l.x, y: BASE.top + f * FLOOR_H + 1.7, z: l.z, w: l.w + 0.06, h: 1.1, d: l.d + 0.06 });
      }
    });
    return { bodies, cornices, roofs, ridges, windows };
  }, []);

  return (
    <group>
      <Boxes boxes={parts.bodies} />
      <Boxes boxes={parts.windows} color={T.windows} basic={T.stars} />
      <Boxes boxes={parts.cornices} color={T.trim} />
      <Boxes boxes={parts.roofs} />
      <Boxes boxes={parts.ridges} />
    </group>
  );
}

// ---------- a few cars on the roads ----------
function Cars() {
  const { bodies, cabins } = useMemo(() => {
    const spots: { x: number; z: number; ry: number }[] = [
      { x: ROADS_NS[1] + 2.8, z: -72, ry: Math.PI / 2 },
      { x: ROADS_NS[1] - 2.8, z: 72, ry: Math.PI / 2 },
      { x: ROADS_NS[0] + 2.8, z: 18, ry: Math.PI / 2 },
      { x: -82, z: ROADS_EW[1] + 2.8, ry: 0 },
      { x: 92, z: ROADS_EW[1] - 2.8, ry: 0 },
      { x: 12, z: ROADS_EW[0] - 2.8, ry: 0 },
      { x: -102, z: ROADS_EW[0] + 2.8, ry: 0 },
    ];
    const bodies: Box[] = [];
    const cabins: Box[] = [];
    spots.forEach((s, i) => {
      const c = T.cars[i % T.cars.length];
      bodies.push({ x: s.x, y: BASE.top + 0.7, z: s.z, w: 4.4, h: 1.1, d: 2, ry: s.ry, c });
      cabins.push({ x: s.x, y: BASE.top + 1.6, z: s.z, w: 2.4, h: 0.8, d: 1.8, ry: s.ry, c });
    });
    return { bodies, cabins };
  }, []);
  return (
    <group>
      <Boxes boxes={bodies} />
      <Boxes boxes={cabins} />
    </group>
  );
}

// ---------- small trees along our footpath (as at the ChoeGo GMC frontage) ----------
/** Points along the inside of our footpath, every `step` units, skipping the doorways. */
function footpathPoints(step: number, inset: number): [number, number][] {
  const shape = roundedRect(RING.x0 + inset, RING.z0 + inset, RING.x1 - inset, RING.z1 - inset, PLOT.r + FOOT - inset);
  return shape.getSpacedPoints(Math.round(shape.getLength() / step))
    .map(p => [p.x, -p.y] as [number, number])
    // keep the entrance (east, z −2…18) and exit (north-east, z −27…−16) clear
    .filter(([x, z]) => !(x > PLOT.x1 - 2 && ((z > -2 && z < 18) || (z > -27 && z < -16))));
}

function Trees() {
  const trunks = useRef<THREE.InstancedMesh>(null);
  const crowns = useRef<THREE.InstancedMesh>(null);
  const trees = useMemo(() => {
    const r = rng(11);
    const out = footpathPoints(10, 1.8).map(([x, z]) => ({ x, z, s: 0.75 + r() * 0.35, c: T.canopy[Math.floor(r() * T.canopy.length)] }));
    // A few trees in the neighbours' yards, away from roads and our block
    for (let tries = 0; tries < 900 && out.length < 120; tries++) {
      const x = BASE.x0 + r() * (BASE.x1 - BASE.x0);
      const z = BASE.z0 + r() * (BASE.z1 - BASE.z0);
      if (!insideBase(x, z, 5) || onRoad(x, z, 3)) continue;
      if (x > RING.x0 - 2 && x < RING.x1 + 2 && z > RING.z0 - 2 && z < RING.z1 + 2) continue;
      out.push({ x, z, s: 0.7 + r() * 0.5, c: T.canopy[Math.floor(r() * T.canopy.length)] });
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const tm = trunks.current;
    const cm = crowns.current;
    if (!tm || !cm) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    trees.forEach((t, i) => {
      o.rotation.set(0, 0, 0);
      o.position.set(t.x, BASE.top + 0.7 * t.s, t.z);
      o.scale.set(t.s, t.s, t.s);
      o.updateMatrix();
      tm.setMatrixAt(i, o.matrix);
      o.position.set(t.x, BASE.top + 2.1 * t.s, t.z);
      o.rotation.set(0, t.x * 0.37, 0);
      o.updateMatrix();
      cm.setMatrixAt(i, o.matrix);
      cm.setColorAt(i, c.set(t.c));
    });
    tm.instanceMatrix.needsUpdate = true;
    cm.instanceMatrix.needsUpdate = true;
    if (cm.instanceColor) cm.instanceColor.needsUpdate = true;
  }, [trees]);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]}>
        <cylinderGeometry args={[0.18, 0.24, 1.4, 5]} />
        <meshStandardMaterial color={T.trunk} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[undefined, undefined, trees.length]}>
        <icosahedronGeometry args={[1.4, 0]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </group>
  );
}

// ---------- street lamps along our footpath and the roads (they glow at night) ----------
function Lamps() {
  const poles = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => {
    const out = footpathPoints(16, 3.2);
    // along the far side of each road
    ROADS_NS.forEach((c, i) => {
      for (let z = BASE.z0 + 14; z < BASE.z1 - 14; z += 18) {
        if (!ROADS_EW.some(e => Math.abs(z - e) < ROAD)) out.push([c + (i ? 1 : -1) * (ROAD / 2 + 1.2), z]);
      }
    });
    ROADS_EW.forEach((c, i) => {
      for (let x = BASE.x0 + 14; x < BASE.x1 - 14; x += 18) {
        if (!ROADS_NS.some(n => Math.abs(x - n) < ROAD)) out.push([x, c + (i ? 1 : -1) * (ROAD / 2 + 1.2)]);
      }
    });
    return out.filter(([x, z]) => insideBase(x, z, 3));
  }, []);

  useLayoutEffect(() => {
    const pm = poles.current;
    const hm = heads.current;
    if (!pm || !hm) return;
    const o = new THREE.Object3D();
    spots.forEach(([x, z], i) => {
      o.position.set(x, BASE.top + 1.3, z);
      o.updateMatrix();
      pm.setMatrixAt(i, o.matrix);
      o.position.set(x, BASE.top + 2.7, z);
      o.updateMatrix();
      hm.setMatrixAt(i, o.matrix);
    });
    pm.instanceMatrix.needsUpdate = true;
    hm.instanceMatrix.needsUpdate = true;
  }, [spots]);

  return (
    <group>
      <instancedMesh ref={poles} args={[undefined, undefined, spots.length]}>
        <cylinderGeometry args={[0.08, 0.08, 2.6, 4]} />
        <meshStandardMaterial color={T.trunk} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, spots.length]}>
        <sphereGeometry args={[0.32, 8, 6]} />
        <meshBasicMaterial color={T.lamp} />
      </instancedMesh>
    </group>
  );
}
