'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { visionChapters, type VisionChapter } from './vision';
import { screenImageURL } from './textures';
import holo from './holo.module.css';
import styles from './vision.module.css';

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  /** Tells the map when the lamp lights (and when it goes out on close). */
  onLitChange: (lit: boolean) => void;
  /** Registers the hologram so the map can pin it above the chamber. */
  anchorRef: (el: HTMLDivElement | null) => void;
  onClose: () => void;
  actions: ReactNode;
}

const PANELS = 16;
const HOLD_MS = 1100;

/**
 * Chamber 1 hologram: press and hold to light a butter lamp, then a 360° forest
 * band opens around it with four chapters to explore. The lamp has to be lit
 * again each time the hologram is opened.
 */
export function HoloVision({ eyebrow, title, intro, onLitChange, anchorRef, onClose, actions }: Props) {
  // The lamp starts unlit every time the hologram opens, and goes out when it closes.
  const [lit, setLit] = useState(false);
  const litChange = useRef(onLitChange);
  useEffect(() => { litChange.current = onLitChange; });
  useEffect(() => () => litChange.current(false), []);
  const onLit = useCallback(() => {
    setLit(true);
    litChange.current(true);
  }, []);

  const [active, setActive] = useState<VisionChapter | null>(null);
  const [progress, setProgress] = useState(0);
  const holding = useRef(false);
  const forestURL = useMemo(() => screenImageURL('forest'), []);
  const compact = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches, []);
  const radius = compact ? 118 : 172;
  const bandHeight = compact ? 84 : 118;
  const panelWidth = 2 * radius * Math.tan(Math.PI / PANELS) + 0.6;

  // ---- press and hold to light --------------------------------------------
  const startHold = useCallback(() => {
    if (lit || holding.current) return;
    holding.current = true;
    const t0 = performance.now();
    const step = (now: number) => {
      if (!holding.current) return;
      const p = Math.min(1, (now - t0) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        holding.current = false;
        onLit();
      } else {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [lit, onLit]);

  const endHold = useCallback(() => {
    holding.current = false;
    if (!lit) setProgress(0);
  }, [lit]);

  // ---- the turning 360° band ----------------------------------------------
  const cylRef = useRef<HTMLDivElement>(null);
  const angle = useRef(0);
  const target = useRef<number | null>(null);
  const hovering = useRef(false);

  useEffect(() => {
    if (!lit) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (target.current !== null) {
        angle.current += (target.current - angle.current) * Math.min(1, dt * 6);
      } else if (!hovering.current) {
        angle.current -= dt * 9;
      }
      if (cylRef.current) cylRef.current.style.transform = `rotateX(-12deg) rotateY(${angle.current}deg)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lit]);

  const openChapter = useCallback((c: VisionChapter | null) => {
    setActive(c);
    if (!c) {
      target.current = null;
      return;
    }
    // Turn the shortest way so the chapter faces the visitor.
    const want = -(c.panel * 360) / PANELS;
    const delta = ((((want - angle.current) % 360) + 540) % 360) - 180;
    target.current = angle.current + delta;
  }, []);

  // Esc closes an open chapter before the map's own Esc (reset view).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      openChapter(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, openChapter]);

  const ring = 2 * Math.PI * 52;

  return (
    <>
      <div ref={anchorRef} className={holo.anchor}>
        <div className={holo.holo}>
          <header className={holo.heading}>
            <p className={holo.eyebrow}>{eyebrow}</p>
            <h2 className={holo.title}>{title}</h2>
          </header>

          <div className={`${styles.stage} ${lit ? styles.stageLit : ''}`} style={{ width: radius * 2 + 40, height: bandHeight + (compact ? 120 : 150) }}>
            {lit && (
              <div className={styles.scene}>
                <div
                  ref={cylRef}
                  className={styles.cylinder}
                  onPointerEnter={() => { hovering.current = true; }}
                  onPointerLeave={() => { hovering.current = false; }}
                >
                  {Array.from({ length: PANELS }, (_, i) => {
                    const chapter = visionChapters.find(c => c.panel === i);
                    return (
                      <div
                        key={i}
                        className={styles.panel}
                        style={{
                          width: panelWidth,
                          height: bandHeight,
                          marginLeft: -panelWidth / 2,
                          marginTop: -bandHeight / 2,
                          transform: `rotateY(${(i * 360) / PANELS}deg) translateZ(${radius}px)`,
                          backgroundImage: `url(${forestURL})`,
                          backgroundSize: `${panelWidth * PANELS}px ${bandHeight}px`,
                          backgroundPosition: `${-i * panelWidth}px 0`,
                        }}
                      >
                        {chapter && (
                          <button
                            type="button"
                            className={`${styles.hotspot} ${active?.id === chapter.id ? styles.hotspotOn : ''}`}
                            onClick={() => openChapter(active?.id === chapter.id ? null : chapter)}
                            aria-label={chapter.title}
                            aria-pressed={active?.id === chapter.id}
                          >
                            <ChapterGlyph id={chapter.id} />
                            <span>{chapter.title}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              className={`${styles.lampButton} ${lit ? styles.lampLit : ''}`}
              onPointerDown={e => { e.preventDefault(); startHold(); }}
              onPointerUp={endHold}
              onPointerLeave={endHold}
              onPointerCancel={endHold}
              onKeyDown={e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); startHold(); } }}
              onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') endHold(); }}
              onContextMenu={e => e.preventDefault()}
              aria-label={lit ? 'Butter lamp, lit' : 'Press and hold to light the butter lamp'}
              disabled={lit}
            >
              {!lit && (
                <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="52" className={styles.ringTrack} />
                  <circle
                    cx="60" cy="60" r="52"
                    className={styles.ringFill}
                    strokeDasharray={ring}
                    strokeDashoffset={ring * (1 - progress)}
                  />
                </svg>
              )}
              <ButterLamp lit={lit} warmth={progress} />
            </button>
            {!lit && <p className={styles.holdHint}>Press &amp; hold to light</p>}
          </div>
        </div>
      </div>

      <aside className={holo.card} aria-live="polite">
        <button type="button" className={holo.close} onClick={onClose} aria-label="Close hologram">×</button>
        {active && (
          <div key={active.id} className={`${holo.cardBody} ${holo.phoneOnly}`}>
            <p className={holo.cardEyebrow}>{active.tagline}</p>
            <h3>{active.title}</h3>
            <p>{active.text}</p>
          </div>
        )}
        <div className={`${holo.cardBody} ${active ? holo.desktopOnly : ''}`}>
          <p className={holo.cardEyebrow}>{eyebrow} · {title}</p>
          <p>{intro}</p>
          <p className={holo.hint}>
            {lit ? 'The lamp is lit — tap a highlight in the 360° view' : 'Press and hold the lamp to light it'}
          </p>
        </div>
        <footer className={holo.actions}>{actions}</footer>
      </aside>

      {active && (
        <div className={`${holo.overlay} ${holo.desktopOnly}`} onClick={() => openChapter(null)}>
          <section
            key={active.id}
            className={holo.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vision-title"
            onClick={e => e.stopPropagation()}
          >
            <button type="button" className={holo.modalX} onClick={() => openChapter(null)} aria-label="Close">×</button>
            <header className={holo.modalHead}>
              <span className={`${holo.modalIcon} ${styles.modalGlyph}`}><ChapterGlyph id={active.id} /></span>
              <div>
                <p className={holo.modalEyebrow}>{active.tagline}</p>
                <h3 id="vision-title">{active.title}</h3>
              </div>
            </header>
            <p className={holo.modalText}>{active.text}</p>
            <footer className={holo.modalFoot}>
              {(['←', '→'] as const).map(dir => {
                const i = visionChapters.findIndex(c => c.id === active.id);
                const n = visionChapters.length;
                const next = visionChapters[(i + (dir === '→' ? 1 : -1) + n) % n];
                return (
                  <button key={dir} type="button" className={holo.modalNav} onClick={() => openChapter(next)} aria-label={dir === '→' ? 'Next chapter' : 'Previous chapter'}>
                    {dir}
                  </button>
                );
              })}
              <button type="button" className={holo.modalClose} onClick={() => openChapter(null)}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

/** A brass butter lamp; the flame fades in while the visitor holds, then flickers. */
function ButterLamp({ lit, warmth }: { lit: boolean; warmth: number }) {
  const flame = lit ? 1 : warmth * 0.6;
  return (
    <svg className={styles.lamp} viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <radialGradient id="lampGlow">
          <stop offset="0" stopColor="rgb(242,212,78)" stopOpacity=".75" />
          <stop offset="1" stopColor="rgb(240,131,89)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lampFlame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset=".45" stopColor="rgb(242,212,78)" />
          <stop offset="1" stopColor="rgb(236,103,87)" />
        </linearGradient>
        <linearGradient id="lampBrass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a6424" />
          <stop offset=".45" stopColor="#f0cf7a" />
          <stop offset="1" stopColor="#9c7230" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="58" r="50" fill="url(#lampGlow)" opacity={flame} />
      <g className={lit ? styles.flicker : undefined} style={{ opacity: flame, transformOrigin: '60px 76px' }}>
        <path d="M60 16C71 36 77 50 73 62C70 72 65 77 60 77C55 77 50 72 47 62C43 50 49 36 60 16Z" fill="url(#lampFlame)" />
        <path d="M60 44C65 54 66 61 64 67C62 72 58 72 56 67C54 61 55 54 60 44Z" fill="#fffbe6" opacity=".85" />
      </g>
      <rect x="58.8" y="72" width="2.4" height="9" rx="1" fill="#2a1d10" />
      <path d="M28 80H92C90 97 77 106 60 106C43 106 30 97 28 80Z" fill="url(#lampBrass)" />
      <ellipse cx="60" cy="80" rx="32" ry="4.5" fill="#6d4c1c" />
      <rect x="53" y="105" width="14" height="14" fill="url(#lampBrass)" />
      <ellipse cx="60" cy="125" rx="27" ry="7" fill="url(#lampBrass)" />
    </svg>
  );
}

/** Small line icons for the four chapters. */
function ChapterGlyph({ id }: { id: VisionChapter['id'] }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden="true">
      {id === 'spirituality' && (
        <g {...common}>
          <path d="M16 5c4 5 5 8 4 11-1 3-3 4-4 4s-3-1-4-4c-1-3 0-6 4-11z" />
          <path d="M8 22h16M10 22c1 4 4 5 6 5s5-1 6-5" />
        </g>
      )}
      {id === 'nature' && (
        <g {...common}>
          <path d="M7 25C7 13 15 7 26 6c0 11-6 19-18 19z" />
          <path d="M7 25 18 14" />
        </g>
      )}
      {id === 'technology' && (
        <g {...common}>
          <ellipse cx="16" cy="16" rx="11" ry="5" />
          <path d="M5 16v4c0 3 5 5 11 5s11-2 11-5v-4" />
          <circle cx="16" cy="12" r="2.5" />
        </g>
      )}
      {id === 'royal-vision' && (
        <g {...common}>
          <circle cx="16" cy="16" r="5" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return <path key={i} d={`M${16 + 8 * Math.cos(a)} ${16 + 8 * Math.sin(a)}L${16 + 12 * Math.cos(a)} ${16 + 12 * Math.sin(a)}`} />;
          })}
        </g>
      )}
    </svg>
  );
}
