'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { sectors } from './sectors';
import { SectorIcon } from './SectorIcon';
import styles from './holo.module.css';

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  /** Registers the dial so the map can pin it above Chamber 3's table. */
  anchorRef: (el: HTMLDivElement | null) => void;
  onClose: () => void;
  actions: ReactNode;
}

const R = 188; // outer radius of the dial (SVG units)
const r = 106; // inner radius
const STEP = 360 / sectors.length;
const GAP = 1.4; // degrees between segments

const polar = (radius: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [radius * Math.cos(a), radius * Math.sin(a)] as const;
};

/** Annular wedge for segment i, centred on the top (-90°) for i = 0. */
function wedge(i: number) {
  const c = -90 + i * STEP;
  const a0 = c - STEP / 2 + GAP, a1 = c + STEP / 2 - GAP;
  const [ox0, oy0] = polar(R, a0), [ox1, oy1] = polar(R, a1);
  const [ix1, iy1] = polar(r, a1), [ix0, iy0] = polar(r, a0);
  return `M${ox0} ${oy0}A${R} ${R} 0 0 1 ${ox1} ${oy1}L${ix1} ${iy1}A${r} ${r} 0 0 0 ${ix0} ${iy0}Z`;
}

/**
 * Chamber 3's sector selector: a holographic dial projected out of the map.
 * Picking a sector turns the dial so it sits at the top. Its details open in a
 * centred overlay on desktop, or in the bottom card on phones.
 * Colours: the GMC logo palette (see holo.module.css); icons keep their own colours.
 */
export function HoloSectors({ eyebrow, title, intro, anchorRef, onClose, actions }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const active = activeIdx === null ? null : sectors[activeIdx];

  const pick = useCallback((idx: number | null) => {
    setActiveIdx(idx);
    if (idx === null) return;
    // Turn the shortest way so the chosen segment lands at the top.
    setRotation(prev => {
      const target = -idx * STEP;
      const delta = ((((target - prev) % 360) + 540) % 360) - 180;
      return prev + delta;
    });
  }, []);

  // Arrow keys turn the dial.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const n = sectors.length;
      const from = activeIdx ?? (e.key === 'ArrowRight' ? -1 : 0);
      pick((from + (e.key === 'ArrowRight' ? 1 : -1) + n) % n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIdx, pick]);

  // Esc closes the sector overlay first, before the map's own Esc (reset view).
  useEffect(() => {
    if (activeIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setActiveIdx(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [activeIdx]);

  const spin = { transform: `rotate(${rotation}deg)` };
  const unspin = { transform: `rotate(${-rotation}deg)` };

  return (
    <>
      <div ref={anchorRef} className={styles.anchor}>
        <div className={styles.holo}>
          <header className={styles.heading}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2 className={styles.title}>{title}</h2>
          </header>

          <div className={styles.dialWrap}>
            <svg className={styles.dial} viewBox="-200 -200 400 400" role="group" aria-label="GMC’s eight priority sectors">
              <circle r={R + 7} className={styles.rim} />
              <circle r={r - 7} className={styles.rimInner} />
              <path d="M0 -199 l-7 -0 7 10 7 -10z" className={styles.pointer} />
              <g className={styles.spin} style={spin}>
                {sectors.map((s, i) => {
                  const [x, y] = polar((R + r) / 2, -90 + i * STEP);
                  const on = i === activeIdx;
                  return (
                    <g
                      key={s.id}
                      className={`${styles.segment} ${on ? styles.segmentOn : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-label={s.title}
                      aria-pressed={on}
                      onClick={() => pick(on ? null : i)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(on ? null : i); } }}
                    >
                      <path d={wedge(i)} />
                      <g transform={`translate(${x} ${y})`}>
                        <g className={styles.spin} style={unspin}>
                          <circle r={on ? 33 : 28} className={styles.iconDisc} />
                          <SectorIcon id={s.id} color={s.color} size={on ? 50 : 42} x={on ? -25 : -21} y={on ? -25 : -21} />
                        </g>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>
            <button type="button" className={styles.hub} onClick={() => pick(null)} aria-label="GMC — show all sectors">
              <Image src="/gmc-mark.webp" alt="" width={64} height={64} unoptimized />
            </button>
            <span className={styles.scan} aria-hidden="true" />
          </div>
        </div>
      </div>

      <aside className={styles.card} aria-live="polite">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close hologram">×</button>
        {active && (
          <div key={active.id} className={`${styles.cardBody} ${styles.phoneOnly}`}>
            <p className={styles.cardEyebrow}>{active.tagline}</p>
            <h3>{active.title}</h3>
            <p>{active.summary}</p>
            <ul>{active.points.map(p => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
        <div className={`${styles.cardBody} ${active ? styles.desktopOnly : ''}`}>
          <p className={styles.cardEyebrow}>{eyebrow} · {title}</p>
          <p>{intro}</p>
          <p className={styles.hint}>Tap a sector on the dial{' '}<span className={styles.keys}>or use ← →</span></p>
        </div>
        <footer className={styles.actions}>{actions}</footer>
      </aside>

      {/* Desktop: sector details as a centred overlay, like the sector ring on gmc.bt. */}
      {active && (
        <div className={`${styles.overlay} ${styles.desktopOnly}`} onClick={() => setActiveIdx(null)}>
          <section
            key={active.id}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sector-title"
            onClick={e => e.stopPropagation()}
          >
            <button type="button" className={styles.modalX} onClick={() => setActiveIdx(null)} aria-label="Close">×</button>
            <header className={styles.modalHead}>
              <span className={styles.modalIcon}><SectorIcon id={active.id} color={active.color} /></span>
              <div>
                <p className={styles.modalEyebrow}>{active.tagline}</p>
                <h3 id="sector-title">{active.title}</h3>
              </div>
            </header>
            <p className={styles.modalText}>{active.summary}</p>
            <ul className={styles.modalList}>{active.points.map(p => <li key={p}>{p}</li>)}</ul>
            <footer className={styles.modalFoot}>
              <button type="button" className={styles.modalNav} onClick={() => pick((activeIdx! - 1 + sectors.length) % sectors.length)} aria-label="Previous sector">←</button>
              <button type="button" className={styles.modalNav} onClick={() => pick((activeIdx! + 1) % sectors.length)} aria-label="Next sector">→</button>
              <button type="button" className={styles.modalClose} onClick={() => setActiveIdx(null)}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
