import * as THREE from 'three';
import type { Pt } from './layout-data';

/** Plan pixels per world unit. */
const SCALE = 10;
/** Plan pixel that becomes the world origin (roughly the centre of the building). */
const ORIGIN: Pt = [515, 290];

/** Plan [x, y] → world [x, z]. */
export function toWorld([px, py]: Pt): [number, number] {
  return [(px - ORIGIN[0]) / SCALE, (py - ORIGIN[1]) / SCALE];
}

/** Bounding box of the whole venue in world units, used to frame the camera. */
export const venueBounds = new THREE.Box3(
  new THREE.Vector3(...worldXYZ([205, 25], 0)),
  new THREE.Vector3(...worldXYZ([850, 550], 2)),
);

export function worldXYZ(p: Pt, y = 0): [number, number, number] {
  const [x, z] = toWorld(p);
  return [x, y, z];
}

/**
 * A flat shape in the XZ plane, extruded upward by `height` and lifted to `base`.
 * Shape space y = -world z, so after rotateX(-90°) the points land where expected.
 */
export function extrudeFootprint(points: Pt[], height: number, base = 0): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape(points.map(p => {
    const [x, z] = toWorld(p);
    return new THREE.Vector2(x, -z);
  }));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 1 });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, base, 0);
  return geometry;
}

/**
 * Turns a wall centre-line into a solid outline of the given thickness (mitred joins),
 * then extrudes it. One mesh per wall keeps the outline edges clean.
 */
export function wallGeometry(points: Pt[], thickness: number, height: number): THREE.ExtrudeGeometry {
  const pts = points.map(p => new THREE.Vector2(...toWorld(p)));
  const half = thickness / 2;
  const left: THREE.Vector2[] = [];
  const right: THREE.Vector2[] = [];

  const normalOf = (a: THREE.Vector2, b: THREE.Vector2) => {
    const d = b.clone().sub(a).normalize();
    return new THREE.Vector2(-d.y, d.x);
  };

  for (let i = 0; i < pts.length; i++) {
    const prev = i > 0 ? normalOf(pts[i - 1], pts[i]) : null;
    const next = i < pts.length - 1 ? normalOf(pts[i], pts[i + 1]) : null;
    let offset: THREE.Vector2;
    if (prev && next) {
      const miter = prev.clone().add(next);
      if (miter.lengthSq() < 1e-6) {
        offset = next.clone().multiplyScalar(half);
      } else {
        miter.normalize();
        const scale = half / Math.max(miter.dot(next), 0.35);
        offset = miter.multiplyScalar(scale);
      }
    } else {
      offset = (prev ?? next)!.clone().multiplyScalar(half);
    }
    left.push(pts[i].clone().add(offset));
    right.push(pts[i].clone().sub(offset));
  }

  const outline = [...left, ...right.reverse()].map(v => new THREE.Vector2(v.x, -v.y));
  const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(outline), {
    depth: height,
    bevelEnabled: false,
    curveSegments: 1,
    UVGenerator: lengthUVGenerator(outline),
  });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/**
 * UVs for extruded walls: u = distance travelled around the outline (metres),
 * v = height (metres). Textures then run continuously round corners and curves
 * instead of jumping between x- and z-based mapping like three's default.
 */
function lengthUVGenerator(outline: THREE.Vector2[]) {
  const key = (x: number, y: number) => `${x.toFixed(3)},${y.toFixed(3)}`;
  const along = new Map<string, number>();
  let total = 0;
  outline.forEach((p, i) => {
    if (i > 0) total += p.distanceTo(outline[i - 1]);
    if (!along.has(key(p.x, p.y))) along.set(key(p.x, p.y), total);
  });
  total += outline[outline.length - 1].distanceTo(outline[0]);

  return {
    generateTopUV(_g: THREE.ExtrudeGeometry, v: number[], a: number, b: number, c: number) {
      return [a, b, c].map(i => new THREE.Vector2(v[i * 3], v[i * 3 + 1]));
    },
    generateSideWallUV(_g: THREE.ExtrudeGeometry, v: number[], a: number, b: number, c: number, d: number) {
      let ua = along.get(key(v[a * 3], v[a * 3 + 1])) ?? 0;
      let ub = along.get(key(v[b * 3], v[b * 3 + 1])) ?? 0;
      if (ub < ua) ub = total; // closing edge wraps back to the start
      if (ua > ub) ua = 0;
      return [
        new THREE.Vector2(ua, v[a * 3 + 2]),
        new THREE.Vector2(ub, v[b * 3 + 2]),
        new THREE.Vector2(ub, v[c * 3 + 2]),
        new THREE.Vector2(ua, v[d * 3 + 2]),
      ];
    },
  };
}

/**
 * A thin vertical strip along a polyline — used for projection screens and
 * feature walls. `uv: 'stretch'` maps the whole art once along the strip,
 * `uv: 'metres'` tiles it by distance like the walls.
 */
export function stripGeometry(points: Pt[], height: number, base = 0, uv: 'stretch' | 'metres' = 'stretch') {
  const pts = points.map(p => toWorld(p));
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = lengths[lengths.length - 1] || 1;
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  pts.forEach(([x, z], i) => {
    const u = uv === 'stretch' ? lengths[i] / total : lengths[i];
    positions.push(x, base, z, x, base + height, z);
    uvs.push(u, 0, u, uv === 'stretch' ? 1 : height);
    if (i > 0) {
      const o = (i - 1) * 2;
      index.push(o, o + 2, o + 1, o + 1, o + 2, o + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** A C-shaped ring (the reception desk). */
export function ringGeometry(center: Pt, outer: number, inner: number, height: number, start: number, end: number) {
  const [cx, cz] = toWorld(center);
  const shape = new THREE.Shape();
  const a0 = (start * Math.PI) / 180;
  const a1 = (end * Math.PI) / 180;
  shape.absarc(cx, -cz, outer, a0, a1, false);
  shape.absarc(cx, -cz, inner, a1, a0, true);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 24 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
