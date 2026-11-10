'use client';

import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Edges, Line } from '@react-three/drei';
import * as THREE from 'three';
import { PLAN_D, PLAN_W, RIVER_COUNT, planBridges, planHeight, planLayers, riverX, type PlanLayerId } from './masterplan';

/**
 * Chamber 2 hologram: a stylised 3D model of the GMC masterplan that builds
 * itself above the city-model table — terrain, then rivers and paddy fields,
 * then the neighbourhoods rising north to south, then bridges, dam and airport.
 */

export interface PlanFocus {
  layer: PlanLayerId | null;
  bridge: string | null;
}

interface Props {
  /** World position of the model's centre (above the table). */
  position: [number, number, number];
  /** World-units per model unit. */
  scale: number;
  active: boolean;
  focus: PlanFocus;
  onPickBridge: (id: string) => void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const isClick = (e: ThreeEvent<MouseEvent>) => e.delta < 6;
const layerColor = Object.fromEntries(planLayers.map(l => [l.id, l.color])) as Record<PlanLayerId, string>;

/** Deterministic random so the city looks the same every time. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function MasterplanHolo({ position, scale, active, focus, onPickBridge }: Props) {
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const time = useRef(0);
  const shown = useRef(0);

  useFrame((_, dt) => {
    const r = root.current;
    if (!r) return;
    shown.current += ((active ? 1 : 0) - shown.current) * Math.min(1, dt * 5);
    r.visible = shown.current > 0.01;
    r.scale.setScalar(scale * (0.3 + 0.7 * shown.current));
    time.current = active ? time.current + dt : 0;
    if (spin.current && active && !focus.bridge) spin.current.rotation.y += dt * 0.1;
  });

  return (
    <group ref={root} position={position} visible={false}>
      <group ref={spin}>
        <BaseSlab />
        <Terrain time={time} />
        <Layer id="water" focus={focus.layer} time={time} appearAt={0.6}><Rivers time={time} /><Paddies /></Layer>
        <Layer id="neighbourhoods" focus={focus.layer} time={time} appearAt={1.5}><Neighbourhoods time={time} /></Layer>
        <Layer id="bridges" focus={focus.layer} time={time} appearAt={3.0}><Bridges selected={focus.bridge} onPick={onPickBridge} /></Layer>
        <Layer id="energy" focus={focus.layer} time={time} appearAt={3.2}><TempleDam /></Layer>
        <Layer id="connections" focus={focus.layer} time={time} appearAt={3.4}><Connections /></Layer>
      </group>
    </group>
  );
}

/**
 * Fades a layer in at its moment in the build, and when another layer is
 * focused, dims it; the focused layer glows in its colour.
 */
function Layer({ id, focus, time, appearAt, children }: { id: PlanLayerId; focus: PlanLayerId | null; time: RefObject<number>; appearAt: number; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const glow = useMemo(() => new THREE.Color(layerColor[id]), [id]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const appear = clamp01((time.current - appearAt) / 0.6);
    const target = appear * (focus && focus !== id ? 0.14 : 1);
    const lit = focus === id ? 0.45 : 0;
    const k = Math.min(1, dt * 6);
    g.traverse(o => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (!m) return;
      m.transparent = true;
      m.opacity += (target - m.opacity) * k;
      const std = m as THREE.MeshStandardMaterial;
      if (std.emissive) {
        std.emissive.copy(glow);
        std.emissiveIntensity += (lit - std.emissiveIntensity) * k;
      }
    });
    g.visible = appear > 0.01;
  });
  return <group ref={group} visible={false}>{children}</group>;
}

function BaseSlab() {
  return (
    <mesh position-y={-0.08}>
      <boxGeometry args={[PLAN_W + 0.4, 0.14, PLAN_D + 0.4]} />
      <meshStandardMaterial color="#434a71" transparent opacity={0.85} />
      <Edges color="#f2d44e" />
    </mesh>
  );
}

function Terrain({ time }: { time: RefObject<number> }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(PLAN_W, PLAN_D, 90, 63);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors: number[] = [];
    const forest = new THREE.Color('#3d6b3e');
    const valley = new THREE.Color('#a3c37a');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = planHeight(x, z);
      pos.setY(i, h);
      c.copy(valley).lerp(forest, clamp01((h - 0.06) / 0.9));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (mat.current) mat.current.opacity = 0.92 * clamp01(time.current / 0.6);
  });
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial ref={mat} vertexColors transparent opacity={0} roughness={0.9} />
    </mesh>
  );
}

/** Rivers draw themselves from the hills down to the valley. */
function Rivers({ time }: { time: RefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const rivers = useMemo(() => Array.from({ length: RIVER_COUNT }, (_, i) => {
    const pts: THREE.Vector3[] = [];
    for (let z = -PLAN_D / 2; z <= PLAN_D / 2 + 0.001; z += 0.2) {
      const x = riverX(i, z);
      pts.push(new THREE.Vector3(x, planHeight(x, z) + 0.035, z + PLAN_D / 2));
    }
    return pts;
  }), []);
  useFrame(() => {
    if (group.current) group.current.scale.z = Math.max(0.001, clamp01((time.current - 0.6) / 1.1));
  });
  return (
    <group ref={group} position-z={-PLAN_D / 2}>
      {rivers.map((pts, i) => <Line key={i} points={pts} color="#5fb4e0" lineWidth={2.2} />)}
    </group>
  );
}

/** Terraced paddy fields along both banks of each river in the valley. */
function Paddies() {
  const items = useMemo(() => {
    const out: { x: number; z: number; tone: number }[] = [];
    for (let i = 0; i < RIVER_COUNT; i++) {
      for (let z = -0.8; z <= PLAN_D / 2 - 0.2; z += 0.34) {
        for (const side of [-1, 1]) out.push({ x: riverX(i, z) + side * 0.15, z, tone: Math.abs(Math.round(z * 3) + side + i) % 2 });
      }
    }
    return out;
  }, []);
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const tones = [new THREE.Color('#7fb04f'), new THREE.Color('#b9d36a')];
    items.forEach((p, i) => {
      m.compose(new THREE.Vector3(p.x, planHeight(p.x, p.z) + 0.015, p.z), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, tones[p.tone]);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      <planeGeometry args={[0.13, 0.3]} />
      <meshStandardMaterial transparent side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

/**
 * Eleven ribbons between the rivers: small scattered buildings in the north,
 * larger ones in the south, each ribbon around a mandala square. Buildings
 * rise north to south during the build.
 */
function Neighbourhoods({ time }: { time: RefObject<number> }) {
  const { buildings, squares } = useMemo(() => {
    const r = rng(42);
    const b: { x: number; z: number; w: number; d: number; h: number; ground: number; delay: number; wood: boolean }[] = [];
    const sq: { x: number; z: number; y: number }[] = [];
    for (let i = 0; i < RIVER_COUNT - 1; i++) {
      for (let z = -1.6; z <= PLAN_D / 2 - 0.25; z += 0.32) {
        const south = clamp01((z + 1.6) / 4.9); // 0 north → 1 south
        if (r() > 0.35 + south * 0.55) continue; // sparser in the north
        const centre = (riverX(i, z) + riverX(i + 1, z)) / 2;
        for (const off of south > 0.45 ? [-0.13, 0.13] : [(r() - 0.5) * 0.2]) {
          const x = centre + off;
          const size = 0.09 + south * 0.12 + r() * 0.04;
          b.push({
            x, z, w: size, d: size * (0.8 + r() * 0.5),
            h: 0.08 + south * 0.22 + r() * 0.1,
            ground: planHeight(x, z),
            delay: 1.5 + ((z + 1.6) / 4.9) * 1.3 + i * 0.02,
            wood: r() < 0.25,
          });
        }
      }
      const mz = 0.6 + (i % 3) * 0.7;
      const mx = (riverX(i, mz) + riverX(i + 1, mz)) / 2;
      sq.push({ x: mx, z: mz, y: planHeight(mx, mz) + 0.02 });
    }
    return { buildings: b, squares: sq };
  }, []);

  const ref = useRef<THREE.InstancedMesh>(null);
  const done = useRef(false);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const white = new THREE.Color('#f4ecdc');
    const wood = new THREE.Color('#c8a27a');
    buildings.forEach((bd, i) => mesh.setColorAt(i, bd.wood ? wood : white));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [buildings]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = time.current;
    if (t < 0.05) done.current = false; // replay the build each time it opens
    if (done.current) return;
    buildings.forEach((bd, i) => {
      const p = clamp01((t - bd.delay) / 0.45);
      const h = Math.max(0.0001, bd.h * p);
      mesh.setMatrixAt(i, m.compose(v.set(bd.x, bd.ground + h / 2, bd.z), q, s.set(bd.w, h, bd.d)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (t > 3.4) done.current = true;
  });

  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, buildings.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent />
      </instancedMesh>
      {squares.map((sq, i) => (
        <group key={i} position={[sq.x, sq.y, sq.z]} rotation-x={-Math.PI / 2}>
          <mesh><ringGeometry args={[0.11, 0.16, 32]} /><meshStandardMaterial color="#f2d44e" transparent side={THREE.DoubleSide} /></mesh>
          <mesh><circleGeometry args={[0.05, 16]} /><meshStandardMaterial color="#ec6757" transparent side={THREE.DoubleSide} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Bridges({ selected, onPick }: { selected: string | null; onPick: (id: string) => void }) {
  return (
    <group>
      {planBridges.map(b => {
        const y = planHeight(b.x, b.z) + 0.34;
        const on = selected === b.id;
        return (
          <group key={b.id} position={[b.x, y, b.z]}>
            <mesh
              scale={on ? 1.15 : 1}
              onClick={e => { if (!isClick(e)) return; e.stopPropagation(); onPick(b.id); }}
              onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = ''; }}
            >
              <boxGeometry args={[b.length, 0.17, 0.28]} />
              <meshStandardMaterial color={on ? '#ec6757' : '#f2d44e'} transparent />
              <Edges color="#7a333c" />
            </mesh>
            {[-1, 1].map(side => (
              <mesh key={side} position={[side * (b.length / 2 - 0.12), -0.2, 0]}>
                <boxGeometry args={[0.07, 0.3, 0.07]} />
                <meshStandardMaterial color="#62697c" transparent />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** The Sankosh Temple-Dam on the western edge, with its reservoir. */
function TempleDam() {
  const x = -PLAN_W / 2 + 0.35, z = -2.2;
  const ground = planHeight(x, z);
  return (
    <group>
      <mesh position={[x + 0.7, planHeight(x + 0.7, z) + 0.06, z]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.1, 1.5]} />
        <meshStandardMaterial color="#5fb4e0" transparent side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[x, ground + 0.35, z]}>
        <boxGeometry args={[0.28, 0.8, 1.6]} />
        <meshStandardMaterial color="#d9cbb2" transparent />
        <Edges color="#7a333c" />
      </mesh>
      <mesh position={[x, ground + 0.86, z]}>
        <boxGeometry args={[0.24, 0.2, 0.34]} />
        <meshStandardMaterial color="#7a333c" transparent />
      </mesh>
      <mesh position={[x, ground + 1.04, z]}>
        <coneGeometry args={[0.2, 0.18, 4]} />
        <meshStandardMaterial color="#f2d44e" transparent />
      </mesh>
    </group>
  );
}

/** International airport in the south-east and a rail line along the south. */
function Connections() {
  const railZ = PLAN_D / 2 - 0.12;
  const rail = useMemo(() => [new THREE.Vector3(-PLAN_W / 2, planHeight(0, railZ) + 0.04, railZ), new THREE.Vector3(PLAN_W / 2, planHeight(0, railZ) + 0.04, railZ)], [railZ]);
  return (
    <group>
      <group position={[3.4, planHeight(3.4, 3.0) + 0.02, 2.95]} rotation-y={0.12}>
        <mesh>
          <boxGeometry args={[2.5, 0.03, 0.32]} />
          <meshStandardMaterial color="#434a71" transparent />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} position={[-1.1 + i * 0.275, 0.02, 0]}>
            <boxGeometry args={[0.12, 0.01, 0.03]} />
            <meshStandardMaterial color="#ffffff" transparent />
          </mesh>
        ))}
        <mesh position={[0.2, 0.1, -0.32]}>
          <boxGeometry args={[0.8, 0.18, 0.22]} />
          <meshStandardMaterial color="#f0835a" transparent />
        </mesh>
      </group>
      <Line points={rail} color="#434a71" lineWidth={2.5} dashed dashSize={0.18} gapSize={0.1} />
    </group>
  );
}
