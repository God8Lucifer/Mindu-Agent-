'use client';

import { useMemo, useRef, type RefObject } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl, Edges, Line } from '@react-three/drei';
import * as THREE from 'three';
import { floorZones, pillars, places, rails, route, screens, walls, type Place, type Pt } from './layout-data';
import { extrudeFootprint, ringGeometry, stripGeometry, toWorld, wallGeometry, worldXYZ } from './geometry';
import { screenTexture, wallTexture } from './textures';
import { sceneTheme as T, zoneColors } from './theme';
import { MasterplanHolo, type PlanFocus } from './MasterplanHolo';

const WALL_HEIGHT = 1.6;
const WALL_THICKNESS = 0.45;
const OUTLINE = T.outline;

export interface SceneProps {
  controlsRef: RefObject<CameraControlsImpl | null>;
  selectedId: string | null;
  /** Light / dark: colours come from ./theme, so a change rebuilds the scene content (not the camera). */
  theme: string;
  /** The room whose hologram is running (only after "I'm here"). */
  holoId: string | null;
  labelRefs: RefObject<Map<string, HTMLElement>>;
  showRoute: boolean;
  /** Chambers whose butter lamp the visitor has lit. */
  litRooms: ReadonlySet<string>;
  /** Chamber 2 masterplan: highlighted layer / bridge. */
  planFocus: PlanFocus;
  onPickBridge: (id: string) => void;
  onSelect: (id: string | null) => void;
}

/** Ignore clicks that were really the end of a drag. */
const isClick = (e: ThreeEvent<MouseEvent>) => e.delta < 6;

export function VenueScene({ controlsRef, theme, selectedId, holoId, labelRefs, showRoute, litRooms, planFocus, onPickBridge, onSelect }: SceneProps) {
  const { ACTION } = CameraControlsImpl;
  return (
    <>
      <color key={`bg-${theme}`} attach="background" args={[T.background]} />
      <fog key={`fog-${theme}`} attach="fog" args={[T.background, 120, 220]} />
      {/* Diffuse light is divided by π, so ~3 total keeps top faces at their token colour. */}
      <ambientLight intensity={1.35} />
      <hemisphereLight key={`sky-${theme}`} args={['#ffffff', T.ground, 0.85]} />
      <directionalLight
        position={[-25, 45, 30]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-bias={-0.0005}
      />

      <CameraControls
        ref={controlsRef}
        makeDefault
        minDistance={10}
        maxDistance={140}
        maxPolarAngle={Math.PI / 2.3}
        smoothTime={0.35}
        mouseButtons={{ left: ACTION.ROTATE, middle: ACTION.DOLLY, right: ACTION.TRUCK, wheel: ACTION.DOLLY }}
        touches={{ one: ACTION.TOUCH_TRUCK, two: ACTION.TOUCH_DOLLY_ROTATE, three: ACTION.TOUCH_TRUCK }}
      />

      <group key={theme}>
      <Ground onMiss={() => onSelect(null)} />
      <NeutralFloors />
      {places.filter(p => p.zone).map(p => (
        <Zone key={p.id} place={p} selected={selectedId === p.id} dimmed={!!selectedId && selectedId !== p.id} onSelect={onSelect} />
      ))}
      <Walls />
      <Screens litRooms={litRooms} />
      {places.filter(p => p.feature === 'vision').map(p => (
        <ButterLamp3D key={p.id} at={p.holoAt ?? p.anchor} lit={litRooms.has(p.id)} />
      ))}
      {places.filter(p => p.feature === 'avatar').map(p => (
        <AvatarStand key={p.id} at={p.holoAt ?? p.anchor} height={p.holoBase ?? 1} />
      ))}
      <Furniture />
      {showRoute && <RouteLine />}
      {places.filter(p => p.feature).map(p => (
        <HoloBeam key={p.id} at={p.holoAt ?? p.anchor} base={p.holoBase ?? 1.02} top={p.holoHeight ?? HOLO_HEIGHT} active={holoId === p.id} />
      ))}
      {places.filter(p => p.feature === 'masterplan').map(p => (
        <MasterplanHolo
          key={p.id}
          position={worldXYZ(p.holoAt ?? p.anchor, (p.holoHeight ?? HOLO_HEIGHT) + 0.25)}
          scale={1.15}
          active={holoId === p.id}
          focus={planFocus}
          onPickBridge={onPickBridge}
        />
      ))}
      </group>
      <LabelProjector labelRefs={labelRefs} />
    </>
  );
}

function Ground({ onMiss }: { onMiss: () => void }) {
  return (
    <group>
      {/* Unlit, so the ground matches the page background exactly. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.33} onClick={e => isClick(e) && onMiss()}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial color={T.background} />
      </mesh>
      {/* Catches only the building's shadow. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.32} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial color={T.outline} opacity={0.14} />
      </mesh>
    </group>
  );
}

function NeutralFloors() {
  const geometries = useMemo(() => floorZones.map(z => extrudeFootprint(z, 0.36, -0.3)), []);
  return geometries.map((g, i) => (
    <mesh key={i} geometry={g} receiveShadow>
      <meshStandardMaterial color={T.floor} />
      <Edges color={OUTLINE} threshold={20} />
    </mesh>
  ));
}

function Zone({ place, selected, dimmed, onSelect }: { place: Place; selected: boolean; dimmed: boolean; onSelect: (id: string) => void }) {
  const geometry = useMemo(() => extrudeFootprint(place.zone!, 0.4, -0.3), [place.zone]);
  const ref = useRef<THREE.Mesh>(null);

  // Ease the selected room upward so it reads as "lifted".
  useFrame((_, dt) => {
    if (!ref.current) return;
    const target = selected ? 0.3 : 0;
    ref.current.position.y += (target - ref.current.position.y) * Math.min(1, dt * 10);
  });

  const base = zoneColors[place.id] ?? T.floor;
  const color = new THREE.Color(base);
  if (dimmed) color.lerp(new THREE.Color(T.dimTo), 0.55);

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      receiveShadow
      castShadow={selected}
      onClick={e => { if (!isClick(e)) return; e.stopPropagation(); onSelect(place.id); }}
      onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <meshStandardMaterial color={color} emissive={base} emissiveIntensity={selected ? 0.35 : 0} />
      <Edges color={selected ? T.outlineSelected : OUTLINE} threshold={20} />
    </mesh>
  );
}

function Walls() {
  const meshes = useMemo(() => walls.map(w => ({
    geometry: wallGeometry(w.points, WALL_THICKNESS, WALL_HEIGHT),
    // ExtrudeGeometry groups: 0 = top/bottom caps, 1 = side faces.
    materials: [
      new THREE.MeshStandardMaterial({ color: T.wall }),
      new THREE.MeshStandardMaterial({ map: wallTexture(w.finish) }),
    ],
  })), []);
  return meshes.map((m, i) => (
    <mesh key={i} geometry={m.geometry} material={m.materials} castShadow receiveShadow>
      <Edges color={OUTLINE} threshold={25} />
    </mesh>
  ));
}

/** Projection screens and feature walls inside the rooms. */
function Screens({ litRooms }: { litRooms: ReadonlySet<string> }) {
  const meshes = useMemo(() => screens.map(s => {
    const map = screenTexture(s.art);
    return {
      geometry: stripGeometry(s.points, s.height, 0.06, s.uv),
      material: new THREE.MeshStandardMaterial({
        map,
        emissiveMap: s.glow ? map : null,
        emissive: s.glow ? '#ffffff' : '#000000',
        emissiveIntensity: s.glow,
        side: THREE.DoubleSide,
      }),
    };
  }), []);

  // Screens tied to a butter lamp sit dark until it is lit, then fade up.
  // Materials are reached through mesh refs so they can be animated per frame.
  const mats = useRef(new Map<number, THREE.MeshStandardMaterial>());
  const dark = useMemo(() => new THREE.Color('#1c1a16'), []);
  const white = useMemo(() => new THREE.Color('#ffffff'), []);
  useFrame((_, dt) => {
    mats.current.forEach((material, i) => {
      const screen = screens[i];
      if (!screen.litBy) return;
      const on = litRooms.has(screen.litBy);
      const k = Math.min(1, dt * 1.5);
      material.color.lerp(on ? white : dark, k);
      material.emissiveIntensity += ((on ? screen.glow : 0.04) - material.emissiveIntensity) * k;
    });
  });

  return meshes.map((m, i) => (
    <mesh
      key={i}
      ref={el => { if (el) mats.current.set(i, el.material as THREE.MeshStandardMaterial); else mats.current.delete(i); }}
      geometry={m.geometry}
      material={m.material}
      receiveShadow
    />
  ));
}

/** A wooden lectern like the ones in Chamber 4; the avatar projects from its top. */
function AvatarStand({ at, height }: { at: Pt; height: number }) {
  return (
    <group position={worldXYZ(at, 0)}>
      <mesh position-y={height / 2} castShadow>
        <boxGeometry args={[0.32, height, 0.32]} />
        <meshStandardMaterial color="#c08a4e" />
        <Edges color={OUTLINE} />
      </mesh>
      <mesh position-y={height + 0.04} rotation-x={-0.35} castShadow>
        <boxGeometry args={[0.7, 0.06, 0.5]} />
        <meshStandardMaterial color="#e8dcc4" />
        <Edges color={OUTLINE} />
      </mesh>
    </group>
  );
}

/** A small brass butter lamp in the room; its flame appears once lit. */
function ButterLamp3D({ at, lit }: { at: Pt; lit: boolean }) {
  const flame = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (flame.current) {
      const target = lit ? 1 : 0;
      const s = flame.current.scale.x + (target - flame.current.scale.x) * Math.min(1, dt * 4);
      flame.current.scale.set(s, s * (1 + Math.sin(t * 13) * 0.08), s);
      flame.current.visible = s > 0.02;
    }
    if (light.current) light.current.intensity += ((lit ? 6 + Math.sin(t * 11) * 0.8 : 0) - light.current.intensity) * Math.min(1, dt * 3);
  });
  return (
    <group position={worldXYZ(at, 0.1)}>
      <mesh position-y={0.2} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 0.4, 20]} />
        <meshStandardMaterial color="#b08a3e" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position-y={0.47}>
        <cylinderGeometry args={[0.42, 0.22, 0.16, 24]} />
        <meshStandardMaterial color="#d8b25e" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={flame} position-y={0.78} scale={0}>
        <coneGeometry args={[0.12, 0.42, 16]} />
        <meshBasicMaterial color="#ffd36b" />
      </mesh>
      <pointLight ref={light} position-y={1} color="#ffb35a" intensity={0} distance={9} decay={1.6} />
    </group>
  );
}

/** A box between two plan points (rails, panels, shelves). */
function Bar({ a, b, height, thickness, color, y = 0, emissive }: { a: Pt; b: Pt; height: number; thickness: number; color: string; y?: number; emissive?: string }) {
  const [x1, z1] = toWorld(a);
  const [x2, z2] = toWorld(b);
  const length = Math.hypot(x2 - x1, z2 - z1);
  const angle = Math.atan2(z2 - z1, x2 - x1);
  return (
    <mesh position={[(x1 + x2) / 2, y + height / 2, (z1 + z2) / 2]} rotation-y={-angle} castShadow receiveShadow>
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial color={color} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 0.6 : 0} />
      <Edges color={OUTLINE} />
    </mesh>
  );
}

function Furniture() {
  const desk = useMemo(() => ringGeometry([705, 345], 1.8, 1.15, 0.9, 40, 320), []);
  return (
    <group>
      {/* Pillars */}
      {pillars.map((p, i) => (
        <mesh key={i} position={worldXYZ(p, WALL_HEIGHT / 2)} castShadow>
          <boxGeometry args={[1, WALL_HEIGHT, 1]} />
          <meshStandardMaterial color={T.pillar} />
        </mesh>
      ))}

      {/* Display rails down the middle of the hall */}
      {rails.map(([a, b], i) => <Bar key={i} a={a} b={b} height={0.5} thickness={0.35} color={T.rail} />)}

      {/* Central display between the two hall paths */}
      <Bar a={[455, 401]} b={[510, 401]} height={1.3} thickness={3.6} color={T.display} />

      {/* Reception desk */}
      <mesh geometry={desk} castShadow>
        <meshStandardMaterial color={T.desk} />
        <Edges color={OUTLINE} />
      </mesh>

      {/* AI assistant kiosk */}
      <Bar a={[618, 402]} b={[634, 402]} height={1.5} thickness={0.6} color={T.kiosk} emissive={T.kioskGlow} />

      {/* Chamber 2: the 3D city model table */}
      <Bar a={[418, 510]} b={[545, 510]} height={0.45} thickness={3.6} color={T.modelTable} />

      {/* Chamber 3: round interactive table (taller than the lifted floor, so no z-fighting) */}
      <group position={worldXYZ([268, 478], 0)}>
        <mesh position-y={0.5} castShadow>
          <cylinderGeometry args={[1.25, 0.95, 1, 40]} />
          <meshStandardMaterial color={T.podium} />
        </mesh>
        <mesh position-y={1.01} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[1.1, 40]} />
          <meshStandardMaterial color="#f3ead2" emissive={T.desk} emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Souvenir shelves */}
      <Bar a={[750, 160]} b={[750, 275]} height={0.9} thickness={0.6} color={T.wood} />
      <Bar a={[808, 160]} b={[808, 275]} height={0.9} thickness={0.6} color={T.wood} />
    </group>
  );
}

function RouteLine() {
  const points = useMemo(() => route.map(p => new THREE.Vector3(...worldXYZ(p, 0.35))), []);
  const lineRef = useRef<{ material: { dashOffset: number } } | null>(null);
  useFrame((_, dt) => {
    if (lineRef.current) lineRef.current.material.dashOffset -= dt * 1.2;
  });

  // Small chevrons halfway along each leg show the walking direction.
  const chevrons = useMemo(() => points.slice(1).map((b, i) => {
    const a = points[i];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    return { mid, angle: Math.atan2(b.z - a.z, b.x - a.x), long: a.distanceTo(b) > 4 };
  }).filter(c => c.long), [points]);

  return (
    <group>
      <Line
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={lineRef as any}
        points={points}
        color={T.route}
        lineWidth={3}
        dashed
        dashSize={0.9}
        gapSize={0.6}
      />
      {chevrons.map((c, i) => (
        <group key={i} position={c.mid} rotation-y={-c.angle}>
          <mesh rotation-z={-Math.PI / 2}>
            <coneGeometry args={[0.45, 0.9, 3]} />
            <meshBasicMaterial color={T.route} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Height (world units) where the sector hologram floats above its table. */
export const HOLO_HEIGHT = 9;

/**
 * A projector beam that rises from a table when its hologram is open:
 * a glowing cone plus rings that drift upward and fade.
 */
function HoloBeam({ at, base, top, active }: { at: Pt; base: number; top: number; active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Mesh[]>([]);
  const cone = useRef<THREE.MeshBasicMaterial>(null);
  const height = top - base;

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    // Grow / collapse the beam.
    const target = active ? 1 : 0;
    g.scale.y += (target - g.scale.y) * Math.min(1, dt * 6);
    g.visible = g.scale.y > 0.01;
    const t = clock.elapsedTime;
    if (cone.current) cone.current.opacity = (0.22 + Math.sin(t * 9) * 0.03) * g.scale.y;
    rings.current.forEach((m, i) => {
      const phase = (t * 0.45 + i / rings.current.length) % 1;
      m.position.y = phase * height;
      const r = 0.9 + phase * 1.6;
      m.scale.set(r, r, 1);
      (m.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.8 * g.scale.y;
    });
  });

  return (
    <group ref={group} position={worldXYZ(at, base)} scale-y={0}>
      <mesh position-y={height / 2}>
        <cylinderGeometry args={[3.2, 0.9, height, 48, 1, true]} />
        <meshBasicMaterial ref={cone} color={T.holo} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {[0, 1, 2].map(i => (
        <mesh key={i} ref={el => { if (el) rings.current[i] = el; }} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.92, 1, 64]} />
          <meshBasicMaterial color={T.holoRing} transparent opacity={0.4} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Positions the DOM labels (rendered outside the canvas) over their 3D anchors
 * every frame. Writing transforms directly avoids a React render per frame.
 */
function LabelProjector({ labelRefs }: { labelRefs: RefObject<Map<string, HTMLElement>> }) {
  const anchors = useMemo(() => [
    ...places.map(p => {
      const lift = p.zone ? 2.4 : p.category === 'access' ? 1.2 : 2.2;
      return { id: p.id, pos: new THREE.Vector3(...worldXYZ(p.anchor, lift)), clamp: false };
    }),
    // Holograms float above their projector table and are kept on screen.
    ...places.filter(p => p.feature).map(p => ({
      id: `holo:${p.id}`,
      pos: new THREE.Vector3(...worldXYZ(p.holoAt ?? p.anchor, p.holoLabelHeight ?? p.holoHeight ?? HOLO_HEIGHT)),
      clamp: true,
    })),
  ], []);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const { id, pos, clamp } of anchors) {
      const el = labelRefs.current?.get(id);
      if (!el) continue;
      v.copy(pos).project(camera);
      let x = ((v.x + 1) / 2) * size.width;
      let y = ((1 - v.y) / 2) * size.height;
      if (clamp) {
        const hw = el.offsetWidth / 2 + 12, hh = el.offsetHeight / 2 + 12;
        x = Math.min(Math.max(x, hw), size.width - hw);
        // Stay below the header (and, on phones, the view buttons under it).
        const top = size.width < 720 ? 196 : 70;
        y = Math.min(Math.max(y, hh + top), size.height - hh);
        el.style.visibility = v.z > 1 ? 'hidden' : 'visible';
      } else {
        const hidden = v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2;
        el.style.visibility = hidden ? 'hidden' : 'visible';
      }
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    }
  });
  return null;
}
