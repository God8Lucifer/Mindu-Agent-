'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChamberPanel } from './ChamberPanel';
import { PERSONA_MS, personas, type PersonaId } from './avatar';
import { AvatarFigure } from './AvatarFigure';
import holo from './holo.module.css';
import styles from './avatar.module.css';

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  /** Registers the hologram so the map can pin it above the stand. */
  anchorRef: (el: HTMLDivElement | null) => void;
  onClose: () => void;
  actions: ReactNode;
}

/**
 * Chamber 4 hologram: a figure projected from the stand that keeps changing —
 * student, builder, monk, resident, professional — until the visitor picks
 * the one that is them.
 */
export function HoloAvatar({ eyebrow, title, intro, anchorRef, actions }: Props) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<PersonaId | null>(null);

  // Cycle through the figures until one is chosen.
  useEffect(() => {
    if (chosen) return;
    const t = setInterval(() => setIndex(i => (i + 1) % personas.length), PERSONA_MS);
    return () => clearInterval(t);
  }, [chosen]);

  const shown = chosen ? personas.find(p => p.id === chosen)! : personas[index];

  const choose = (id: PersonaId) => {
    setChosen(id);
    setIndex(personas.findIndex(p => p.id === id));
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
            {/* Keyed by persona so each change replays the materialise effect. */}
            <div key={shown.id} className={`${styles.figure} ${chosen ? styles.figureChosen : ''}`}>
              <AvatarFigure id={shown.id} />
              <span className={styles.scan} aria-hidden="true" />
            </div>
            <span className={styles.pad} aria-hidden="true" />
          </div>

          <p className={styles.caption} aria-live="polite">
            <strong>{chosen ? `You · ${shown.title}` : shown.title}</strong>
            <span>{shown.role}</span>
          </p>
          {!chosen && (
            <div className={styles.dots} aria-hidden="true">
              {personas.map((p, i) => <span key={p.id} className={i === index ? styles.dotOn : ''} />)}
            </div>
          )}
        </div>
      </div>

      <ChamberPanel title={title} resetKey={chosen ?? 'intro'}>
        {chosen ? (
          <div key={chosen} className={holo.cardBody}>
            <p className={holo.cardEyebrow}>Your future in GMC</p>
            <h3>You, as a {shown.title.toLowerCase()}</h3>
            <p>{shown.text}</p>
          </div>
        ) : (
          <div className={holo.cardBody}>
            <p className={holo.cardEyebrow}>{eyebrow} · {title}</p>
            <p>{intro}</p>
            <p className={holo.hint}>Who will you be? Tap one to make it yours</p>
          </div>
        )}
        <div className={styles.chips} role="group" aria-label="Choose your avatar">
          {personas.map(p => (
            <button
              key={p.id}
              type="button"
              className={`${styles.chip} ${chosen === p.id ? styles.chipOn : ''} ${!chosen && shown.id === p.id ? styles.chipLive : ''}`}
              onClick={() => (chosen === p.id ? setChosen(null) : choose(p.id))}
              aria-pressed={chosen === p.id}
            >
              {p.title}
            </button>
          ))}
          {chosen && (
            <button type="button" className={styles.shuffle} onClick={() => setChosen(null)}>↻ Shuffle again</button>
          )}
        </div>
        <label className={holo.panelSelect}>
          Choose your avatar
          <select value={chosen ?? ''} onChange={event => event.target.value ? choose(event.target.value as PersonaId) : setChosen(null)}>
            <option value="">Shuffle avatars</option>
            {personas.map(persona => <option key={persona.id} value={persona.id}>{persona.title}</option>)}
          </select>
        </label>
        <footer className={holo.actions}>{actions}</footer>
      </ChamberPanel>
    </>
  );
}
