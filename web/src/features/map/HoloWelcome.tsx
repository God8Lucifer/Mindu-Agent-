'use client';

import { useState, type ReactNode } from 'react';
import { WelcomeFigures } from './WelcomeFigures';
import holo from './holo.module.css';
import styles from './welcome.module.css';

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  anchorRef: (el: HTMLDivElement | null) => void;
  onClose: () => void;
  /** Starts the tour: flies to Chamber 1. */
  onStart: () => void;
  actions: ReactNode;
}

/**
 * Reception hologram: two hosts in national dress bow and offer a khadar.
 * The visitor receives it, then starts their journey at Chamber 1.
 * Resets each time it opens.
 */
export function HoloWelcome({ eyebrow, title, intro, anchorRef, onClose, onStart, actions }: Props) {
  const [received, setReceived] = useState(false);

  return (
    <>
      <div ref={anchorRef} className={holo.anchor}>
        <div className={holo.holo}>
          <header className={`${holo.heading} ${styles.greeting}`}>
            <p className={holo.eyebrow}>{eyebrow}</p>
            <h2 className={holo.title}>Kuzuzangpo la!</h2>
            <p className={styles.sub}>Welcome to Gelephu Mindfulness City</p>
          </header>
          <div className={`${styles.stage} ${received ? styles.stageDone : ''}`}>
            <div className={styles.hosts}>
              <WelcomeFigures received={received} />
              <span className={styles.scan} aria-hidden="true" />
            </div>
            <span className={styles.pad} aria-hidden="true" />
            {received && <span className={styles.gift} aria-hidden="true" />}
          </div>
        </div>
      </div>

      <aside className={holo.card} aria-live="polite">
        <button type="button" className={holo.close} onClick={onClose} aria-label="Close hologram">×</button>
        {received ? (
          <div key="done" className={holo.cardBody}>
            <p className={holo.cardEyebrow}>Khadar received</p>
            <h3>Welcome, honoured guest</h3>
            <p>Your journey begins in Chamber 1 · The Vision, where you will light a butter lamp and step into the 360° theatre.</p>
            <div className={styles.cta}>
              <button type="button" className={styles.start} onClick={onStart}>Start your journey →</button>
            </div>
          </div>
        ) : (
          <div key="offer" className={holo.cardBody}>
            <p className={holo.cardEyebrow}>{eyebrow} · {title}</p>
            <p>{intro}</p>
            <p className={styles.note}>
              A khadar — a white ceremonial scarf — is offered to welcome honoured guests in Bhutan.
            </p>
            <div className={styles.cta}>
              <button type="button" className={styles.start} onClick={() => setReceived(true)}>Receive the khadar</button>
            </div>
          </div>
        )}
        <footer className={holo.actions}>{actions}</footer>
      </aside>
    </>
  );
}
