'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { souvenirs, type SouvenirId } from './souvenir';
import { ShoppingBag, SouvenirArt } from './SouvenirArt';
import holo from './holo.module.css';
import styles from './souvenir.module.css';

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  anchorRef: (el: HTMLDivElement | null) => void;
  onClose: () => void;
  actions: ReactNode;
}

const LIST_KEY = 'mindu-souvenir-list';
const N = souvenirs.length;

function loadList(): SouvenirId[] {
  try { return JSON.parse(localStorage.getItem(LIST_KEY) ?? '[]'); } catch { return []; }
}

/**
 * Souvenir Shop hologram: a shopping bag rises from the shop and souvenirs
 * float out of it, circling slowly. Tapping one brings it to the front and
 * shows it in the card, where it can be saved to the visitor's list.
 */
export function HoloSouvenir({ eyebrow, title, intro, anchorRef, actions }: Props) {
  const [active, setActive] = useState<SouvenirId | null>(null);
  const [list, setList] = useState<SouvenirId[]>(() => loadList());
  const itemRefs = useRef(new Map<SouvenirId, HTMLButtonElement>());
  const angle = useRef(0);
  const target = useRef<number | null>(null);
  const spread = useRef(0); // 0 → items inside the bag, 1 → full orbit

  useEffect(() => {
    try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
  }, [list]);

  // Orbit loop: positions each item on an ellipse around the bag.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const compact = window.matchMedia('(max-width: 720px)').matches;
    const rx = compact ? 110 : 150, ry = compact ? 34 : 46;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      spread.current = Math.min(1, spread.current + dt * 0.9);
      if (target.current !== null) angle.current += (target.current - angle.current) * Math.min(1, dt * 6);
      else angle.current += dt * 0.35;
      const s = 1 - Math.pow(1 - spread.current, 3); // ease out
      souvenirs.forEach((item, i) => {
        const el = itemRefs.current.get(item.id);
        if (!el) return;
        const a = angle.current + (i / N) * Math.PI * 2;
        const depth = (Math.sin(a) + 1) / 2; // 1 = front (bottom of the ellipse)
        const x = Math.cos(a) * rx * s;
        const y = Math.sin(a) * ry * s - (1 - s) * 30;
        const scale = (0.55 + 0.45 * depth) * (0.4 + 0.6 * s);
        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
        el.style.zIndex = String(depth > 0.5 ? 3 : 1);
        el.style.opacity = String((0.45 + 0.55 * depth) * Math.min(1, s * 1.4));
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const pick = useCallback((id: SouvenirId | null) => {
    setActive(id);
    if (!id) { target.current = null; return; }
    // Turn so this item sits at the front (bottom of the ellipse, angle π/2).
    const i = souvenirs.findIndex(s => s.id === id);
    const want = Math.PI / 2 - (i / N) * Math.PI * 2;
    const delta = ((((want - angle.current) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    target.current = angle.current + delta;
  }, []);

  const item = souvenirs.find(s => s.id === active) ?? null;
  const saved = active ? list.includes(active) : false;
  const toggleSave = () => {
    if (!active) return;
    setList(l => (l.includes(active) ? l.filter(x => x !== active) : [...l, active]));
  };

  return (
    <>
      <div ref={anchorRef} className={holo.anchor}>
        <div className={holo.holo}>
          <header className={holo.heading}>
            <p className={holo.eyebrow}>{eyebrow}</p>
            <h2 className={holo.title}>{title}</h2>
          </header>
          <div className={styles.stage}>
            <div className={styles.orbit}>
              {souvenirs.map(s => (
                <button
                  key={s.id}
                  ref={el => { if (el) itemRefs.current.set(s.id, el); else itemRefs.current.delete(s.id); }}
                  type="button"
                  className={`${styles.item} ${active === s.id ? styles.itemOn : ''}`}
                  onClick={() => pick(active === s.id ? null : s.id)}
                  aria-label={s.title}
                  aria-pressed={active === s.id}
                >
                  <SouvenirArt id={s.id} />
                  {list.includes(s.id) && <span className={styles.heart} aria-hidden="true">♥</span>}
                </button>
              ))}
            </div>
            <div className={styles.bag}><ShoppingBag /></div>
            <span className={styles.pad} aria-hidden="true" />
          </div>
        </div>
      </div>

      <aside className={holo.card} aria-live="polite">
        {item ? (
          <div key={item.id} className={holo.cardBody}>
            <p className={holo.cardEyebrow}>{item.tagline}</p>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <button type="button" className={`${styles.save} ${saved ? styles.saved : ''}`} onClick={toggleSave} aria-pressed={saved}>
              {saved ? '♥ On my list' : '♡ Add to my list'}
            </button>
          </div>
        ) : (
          <div className={holo.cardBody}>
            <p className={holo.cardEyebrow}>{eyebrow} · {title}</p>
            <p>{intro}</p>
            <p className={holo.hint}>Tap a souvenir to take a closer look</p>
          </div>
        )}
        <p className={styles.listLine}>
          {list.length
            ? <>My list: {list.map(id => souvenirs.find(s => s.id === id)?.title).join(', ')}</>
            : 'Items shown are examples — ask in the shop for what’s available.'}
        </p>
        <footer className={holo.actions}>{actions}</footer>
      </aside>
    </>
  );
}
