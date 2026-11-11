'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { CameraControlsImpl } from '@react-three/drei';
import { categoryLabels, places, routeOrder, type Place, type PlaceCategory } from './layout-data';
import { toWorld, venueBounds } from './geometry';
import { HOLO_HEIGHT, VenueScene } from './VenueScene';
import { PageNav } from '@/components/PageNav';
import { useTheme } from '@/components/theme';
import { HoloSectors } from './HoloSectors';
import { HoloVision } from './HoloVision';
import { HoloAvatar } from './HoloAvatar';
import { HoloWelcome } from './HoloWelcome';
import { HoloSouvenir } from './HoloSouvenir';
import { PlaceGlyph } from './PlaceGlyph';
import { HoloMasterplan, emptyPlanState, type PlanUIState } from './HoloMasterplan';
import styles from './map.module.css';

type Panel = 'find' | 'search' | null;
type View = '3d' | 'top';

const STORAGE_KEY = 'mindu-map-progress';
const byId = new Map(places.map(p => [p.id, p]));
const categoryOrder: PlaceCategory[] = ['chamber', 'service', 'shop', 'access'];

interface Progress { visited: string[]; current: string | null }

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { visited: [], current: null, ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return { visited: [], current: null };
}

const BACK_KEY = 'mindu-back-url';

function loadBackToMindu(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('back');
    if (fromUrl && /^https?:\/\//.test(fromUrl)) sessionStorage.setItem(BACK_KEY, fromUrl);
    return sessionStorage.getItem(BACK_KEY);
  } catch {
    return null;
  }
}

export default function VenueMap() {
  const controlsRef = useRef<CameraControlsImpl | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const labelRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [selectedId, setSelectedRaw] = useState<string | null>(null);
  // Chamber 2 masterplan state; reset whenever the selection changes.
  const [planState, setPlanState] = useState<PlanUIState>(emptyPlanState);
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedRaw(id);
    setPlanState(emptyPlanState);
  }, []);
  const [panel, setPanel] = useState<Panel>(null);
  const [view, setView] = useState<View>('3d');
  const [showRoute, setShowRoute] = useState(true);
  const [query, setQuery] = useState('');
  const [openGroup, setOpenGroup] = useState<PlaceCategory | null>('chamber');
  // The map is client-only (ssr: false), so storage can be read during the first render.
  // Opened from the GMC guide (?back=<url>): "Back to GMC" returns there.
  const [backToMindu] = useState<string | null>(loadBackToMindu);
  const [visited, setVisited] = useState<Set<string>>(() => new Set(loadProgress().visited));
  const [currentId, setCurrentId] = useState<string | null>(() => loadProgress().current);
  // Chambers whose butter lamp is lit right now (only while their hologram is open).
  const [litRooms, setLitRooms] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<string | null>(null);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  // A room's hologram only starts once the visitor taps "I'm here" in that room.
  const holoOn = !!selected?.feature && currentId === selected.id;
  // The 3D scene reads its colours on render, so re-render it when the theme flips.
  const theme = useTheme();
  const nextStop = useMemo(() => routeOrder.find(id => byId.get(id)?.category === 'chamber' && !visited.has(id)) ?? null, [visited]);

  // ---- camera moves -------------------------------------------------------
  const overview = useCallback((mode: View = view, smooth = true) => {
    const c = controlsRef.current;
    if (!c) return;
    // fitToBox snaps the angle to 90° steps, so frame the venue by hand instead.
    const center = venueBounds.getCenter(new THREE.Vector3());
    const radius = venueBounds.getSize(new THREE.Vector3()).setY(0).length() / 2;
    const fit = c.getDistanceToFitSphere(radius) * (mode === 'top' ? 0.78 : 0.8);
    if (mode === 'top') c.rotateTo(0, 0.0001, smooth);
    else c.rotateTo(0.38, 0.82, smooth);
    c.moveTo(center.x, 0, center.z, smooth);
    c.dollyTo(fit, smooth);
  }, [view]);

  const flyTo = useCallback((place: Place, holo = false) => {
    const c = controlsRef.current;
    if (!c) return;
    const aspect = (c.camera as THREE.PerspectiveCamera).aspect || 1;
    // Portrait phones see a much narrower slice, so pull the camera back.
    const k = aspect < 1 ? 1.6 : 1;

    if (place.feature && holo) {
      // Frame the hologram rising from the table: on wide screens leave room
      // for the card on the right; on phones lift it above the bottom sheet.
      const [hx, hz] = toWorld(place.holoAt ?? place.anchor);
      // A lower, closer camera than usual, aimed between the table and the
      // hologram, so the room, the beam and the dial all fit on screen.
      // The card sits at the bottom, so keep the hologram centred.
      const tx = hx;
      const top = place.holoHeight ?? HOLO_HEIGHT;
      // The masterplan model is wide, so it gets a little more distance.
      const wideModel = place.feature === 'masterplan';
      // Aim below the model so it sits in the upper half, clear of the bottom card.
      const ty = wideModel ? top - (aspect >= 1 ? 2.6 : 0.6) : top * 0.5;
      const d = (aspect >= 1 ? 1.15 : 1.25) * (wideModel ? (aspect >= 1 ? 1.0 : 1.2) : 1);
      if (view === 'top') c.setLookAt(tx, 40 * d * k, hz + 0.01, tx, 0, hz, true);
      else c.setLookAt(tx + 9 * d * k, ty + 13 * d * k, hz + 20 * d * k, tx, ty, hz, true);
      return;
    }

    // Aim a little south of the place so it sits above the card at the bottom.
    const [x, z] = toWorld(place.anchor);
    const tz = z + 3 * k;
    if (view === 'top') c.setLookAt(x, 38 * k, tz + 0.01, x, 0, tz, true);
    else c.setLookAt(x + 9 * k, 22 * k, tz + 18 * k, x, 0, tz, true);
  }, [view]);

  const select = useCallback((id: string | null, fly = false) => {
    setSelectedId(id);
    if (id && fly) {
      const place = byId.get(id);
      if (place) flyTo(place, place.id === currentId);
    }
  }, [flyTo, setSelectedId, currentId]);

  // Registers a hologram's floating element so the scene can pin it over its chamber.
  const holoAnchor = useCallback((id: string) => (el: HTMLDivElement | null) => {
    const key = `holo:${id}`;
    if (el) labelRefs.current.set(key, el); else labelRefs.current.delete(key);
  }, []);

  const choose = (id: string) => {
    setPanel(null);
    setQuery('');
    select(id, true);
  };

  // ---- startup: frame the venue, honour ?place= ---------
  useEffect(() => {
    // Wait until the controls exist and the canvas has a real size (aspect),
    // otherwise the fit distance comes out as NaN and the view is blank.
    let frame = 0;
    const init = () => {
      const c = controlsRef.current;
      const aspect = (c?.camera as THREE.PerspectiveCamera | undefined)?.aspect;
      if (!c || !aspect || !Number.isFinite(aspect)) {
        frame = requestAnimationFrame(init);
        return;
      }
      overview('3d', false);
      const linked = new URLSearchParams(location.search).get('place');
      if (linked && byId.has(linked)) select(linked, true);
    };
    frame = requestAnimationFrame(init);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ visited: [...visited], current: currentId })); } catch { /* ignore */ }
  }, [visited, currentId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const switchView = (mode: View) => {
    setView(mode);
    overview(mode);
  };

  // ---- keyboard shortcuts (match the Devcon-style hints) --------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) {
        if (e.key === 'Escape') setPanel(null);
        return;
      }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); setPanel(p => (p === 'find' ? null : 'find')); }
      else if (e.key === '/') { e.preventDefault(); setPanel('search'); }
      else if (e.key === 'r' || e.key === 'R') setShowRoute(s => !s);
      else if (e.key === 't' || e.key === 'T') switchView(view === 'top' ? '3d' : 'top');
      else if (e.key === 'Escape') { setPanel(null); setSelectedId(null); overview(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => { if (panel === 'search') searchRef.current?.focus(); }, [panel]);

  const markHere = (id: string) => {
    setCurrentId(id);
    setVisited(v => new Set(v).add(id));
  };

  // "I'm here" in a hologram room starts the hologram: frame it as it rises.
  const framedHolo = useRef<string | null>(null);
  useEffect(() => {
    if (!holoOn || !selected) { framedHolo.current = null; return; }
    if (framedHolo.current === selected.id) return;
    framedHolo.current = selected.id;
    flyTo(selected, true);
  }, [holoOn, selected, flyTo]);

  const goNext = () => {
    if (nextStop) choose(nextStop);
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter(p => `${p.name} ${p.description} ${p.badge ?? ''} ${categoryLabels[p.category]}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className={styles.stage}>
      <Canvas
        shadows
        flat // no tone mapping, so scene colours match the GMC tokens
        dpr={[1, 2]}
        camera={{ position: [20, 55, 60], fov: 40, near: 0.5, far: 500 }}
        onPointerMissed={() => setSelectedId(null)}
        className={styles.canvas}
      >
        <VenueScene
          controlsRef={controlsRef}
          theme={theme}
          selectedId={selectedId}
          holoId={holoOn ? selectedId : null}
          labelRefs={labelRefs}
          litRooms={litRooms}
          planFocus={planState}
          onPickBridge={id => setPlanState({ layer: 'bridges', bridge: id, open: true })}
          showRoute={showRoute}
          onSelect={id => select(id, true)}
        />
      </Canvas>

      {/* Map labels, positioned over the 3D scene by LabelProjector */}
      <div className={`${styles.labels} ${holoOn ? styles.labelsDim : ''}`}>
        {/* A place showing its hologram hides its label, which would sit under the dial. */}
        {places.filter(p => !(holoOn && p.id === selectedId)).map(p => (
          <MapLabel
            key={p.id}
            place={p}
            selected={selectedId === p.id}
            current={currentId === p.id}
            visited={visited.has(p.id)}
            onSelect={() => select(p.id, true)}
            refCallback={el => { if (el) labelRefs.current.set(p.id, el); else labelRefs.current.delete(p.id); }}
          />
        ))}
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoTile}>
            <Image src="/gmc-logo-light.svg" alt="Gelephu Mindfulness City logo" width={34} height={34} unoptimized priority />
          </span>
          <div>
            <span className={styles.eyebrow}>Gelephu Mindfulness City</span>
            <strong>Experience Centre Map</strong>
          </div>
        </div>
      </header>

{!holoOn && (
      <p className={styles.hints}>
        <span className={styles.hintMouse}>Drag rotates · Right-drag pans · Scroll zooms</span>
        <span className={styles.hintTouch}>Swipe pans · Two fingers rotate · Pinch zooms</span>
        <span className={styles.hintKeys}><kbd>F</kbd> Find <kbd>/</kbd> Search <kbd>R</kbd> Route <kbd>T</kbd> Top view <kbd>Esc</kbd> Reset</span>
      </p>
      )}

      {/* View controls */}
      <div className={styles.viewRail} role="group" aria-label="View">
        <button type="button" className={view === '3d' ? styles.on : ''} onClick={() => switchView('3d')}>3D</button>
        <button type="button" className={view === 'top' ? styles.on : ''} onClick={() => switchView('top')}>Top</button>
        <button type="button" className={showRoute ? styles.on : ''} onClick={() => setShowRoute(s => !s)} aria-pressed={showRoute}>Route</button>
        <button type="button" onClick={() => { setSelectedId(null); overview(); }}>Reset</button>
      </div>

      {/* Find panel */}
      {panel === 'find' && (
        <section className={styles.panel} aria-label="Find a place">
          <div className={styles.panelHead}>
            <h2>Find a place</h2>
            <button type="button" className={styles.close} onClick={() => setPanel(null)} aria-label="Close">×</button>
          </div>
          <div className={styles.panelBody}>
            {categoryOrder.map(cat => {
              const items = places.filter(p => p.category === cat);
              const open = openGroup === cat;
              return (
                <div key={cat} className={styles.group}>
                  <button type="button" className={styles.groupHead} onClick={() => setOpenGroup(open ? null : cat)} aria-expanded={open}>
                    <span>{categoryLabels[cat]}</span>
                    <span className={styles.count}>{items.length} <span className={open ? styles.chevUp : styles.chev}>⌄</span></span>
                  </button>
                  {open && items.map(p => <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} active={p.id === selectedId} onClick={() => choose(p.id)} />)}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Search panel */}
      {panel === 'search' && (
        <section className={styles.panel} aria-label="Search the map">
          <div className={styles.panelHead}>
            <h2>Search the map</h2>
            <button type="button" className={styles.close} onClick={() => setPanel(null)} aria-label="Close">×</button>
          </div>
          <div className={styles.searchBox}>
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && results[0]) choose(results[0].id); }}
              placeholder="Chambers, reception, exit…"
              aria-label="Search places"
            />
          </div>
          <div className={styles.panelBody}>
            {results.length
              ? results.map(p => <PlaceRow key={p.id} place={p} visited={visited.has(p.id)} active={p.id === selectedId} onClick={() => choose(p.id)} />)
              : <p className={styles.empty}>Nothing matches “{query}”.</p>}
          </div>
        </section>
      )}

      {/* Bottom-left buttons */}
      <div className={styles.dock}>
        <button type="button" className={panel === 'find' ? styles.dockOn : ''} onClick={() => setPanel(p => (p === 'find' ? null : 'find'))}>☰ Find</button>
      </div>

      <PageNav back={backToMindu} />

      {/* Place card, or the richer Chamber 3 panel */}
      {selected && (() => {
        const actions = (
          <>
            {selected.id !== 'fire-exit' && (
              currentId === selected.id
                ? <span className={styles.hereTag}>● You are here</span>
                : <button type="button" className={styles.primary} onClick={() => markHere(selected.id)}>I’m here</button>
            )}
            {nextStop && nextStop !== selected.id && (
              <button type="button" className={styles.secondary} onClick={goNext}>Next chamber →</button>
            )}
          </>
        );

        const holoProps = {
          eyebrow: selected.category === 'chamber' ? `Chamber ${selected.badge}` : selected.category === 'shop' ? 'Souvenir Shop' : 'Reception',
          title: selected.headline ?? selected.name,
          intro: selected.description,
          anchorRef: holoAnchor(selected.id),
          onClose: () => setSelectedId(null),
          actions,
        };
        // Before "I'm here", a hologram room shows the plain card below.
        if (holoOn && selected.feature === 'sectors') return <HoloSectors key={selected.id} {...holoProps} />;
        if (holoOn && selected.feature === 'avatar') return <HoloAvatar key={selected.id} {...holoProps} />;
        if (holoOn && selected.feature === 'souvenir') return <HoloSouvenir key={selected.id} {...holoProps} />;
        if (holoOn && selected.feature === 'welcome') {
          return <HoloWelcome key={selected.id} {...holoProps} onStart={() => select('chamber1', true)} />;
        }
        if (holoOn && selected.feature === 'masterplan') {
          return <HoloMasterplan key={selected.id} {...holoProps} state={planState} onChange={setPlanState} />;
        }
        if (holoOn && selected.feature === 'vision') {
          return (
            <HoloVision
              key={selected.id}
              {...holoProps}
              onLitChange={on => setLitRooms(prev => {
                const next = new Set(prev);
                if (on) next.add(selected.id); else next.delete(selected.id);
                return next;
              })}
            />
          );
        }

        return (
          <article className={styles.card} aria-live="polite">
            <button type="button" className={styles.cardClose} onClick={() => setSelectedId(null)} aria-label="Close">×</button>
            <div className={styles.cardHead}>
              <span className={`${styles.cardBadge} ${styles[`tone_${selected.category}`]}`}>
                <PlaceGlyph place={selected} fallback={selected.category === 'access' ? '→' : '✦'} />
              </span>
              <div>
                <h3>{selected.name}</h3>
                <p className={styles.cardMeta}>
                  {categoryLabels[selected.category].replace(/s$/, '')}{selected.area ? ` · ${selected.area}` : ''}
                  {routeOrder.includes(selected.id) && ` · Stop ${routeOrder.indexOf(selected.id) + 1} of ${routeOrder.length}`}
                </p>
              </div>
            </div>
            <p className={styles.cardText}>{selected.description}</p>
            <div className={styles.cardActions}>{actions}</div>
          </article>
        );
      })()}

      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
}

function PlaceRow({ place, visited, active, onClick }: { place: Place; visited: boolean; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`${styles.row} ${active ? styles.rowActive : ''}`} onClick={onClick}>
      <span className={`${styles.rowBadge} ${styles[`tone_${place.category}`]}`}><PlaceGlyph place={place} fallback="•" /></span>
      <span className={styles.rowText}>
        <span>{place.name}</span>
        {place.area && <small>{place.area}</small>}
      </span>
      {visited && <span className={styles.tick} aria-label="visited">✓</span>}
    </button>
  );
}

function MapLabel({ place, selected, current, visited, onSelect, refCallback }: {
  place: Place; selected: boolean; current: boolean; visited: boolean;
  onSelect: () => void; refCallback: (el: HTMLButtonElement | null) => void;
}) {
  const kind = place.category === 'access' ? styles.badgeAccess : place.category === 'chamber' ? styles.badgeChamber : styles.badgeService;
  const glyph = <PlaceGlyph place={place} fallback={place.id === 'ai' ? '✦' : place.id === 'postcard' ? '✉' : place.id === 'fire-exit' ? '!' : '→'} />;
  return (
    <button
      ref={refCallback}
      type="button"
      className={[styles.label, selected && styles.labelSelected, current && styles.labelCurrent].filter(Boolean).join(' ')}
      onClick={onSelect}
      aria-label={`${place.name}${visited ? ', visited' : ''}${current ? ', you are here' : ''}`}
    >
      <span className={styles.labelInner}>
        <span className={`${styles.badge} ${kind}`}>{visited && place.category === 'chamber' ? '✓' : glyph}</span>
        <span className={styles.labelText}>{place.name}</span>
        {current && <span className={styles.here}>You are here</span>}
      </span>
    </button>
  );
}
