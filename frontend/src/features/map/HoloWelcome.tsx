'use client';

import type { ReactNode } from 'react';
import { WelcomeFigures } from './WelcomeFigures';
import holo from './holo.module.css';
import styles from './welcome.module.css';

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  anchorRef: (el: HTMLDivElement | null) => void;
  onClose: () => void;
  actions: ReactNode;
}

/**
 * Reception hologram: two hosts in national dress bow and offer a khadar.
 * Hosts welcome the visitor while the panel offers the tour navigation.
 */
export function HoloWelcome({ eyebrow, title, intro, anchorRef, actions }: Props) {
  return (
    <>
      <div ref={anchorRef} className={holo.anchor}>
        <div className={holo.holo}>
          <header className={`${holo.heading} ${styles.greeting}`}>
            <p className={holo.eyebrow}>{eyebrow}</p>
            <h2 className={holo.title}>Kuzuzangpo la!</h2>
            <p className={styles.sub}>Welcome to Gelephu Mindfulness City</p>
          </header>
          <div className={styles.stage}>
            <div className={styles.hosts}>
              <WelcomeFigures received={false} />
              <span className={styles.scan} aria-hidden="true" />
            </div>
            <span className={styles.pad} aria-hidden="true" />
          </div>
        </div>
      </div>

      <aside className={holo.card} aria-live="polite">
          <div className={holo.cardBody}>
            <p className={holo.cardEyebrow}>{eyebrow} · {title}</p>
            <p>{intro}</p>
            <p className={styles.note}>
              A khadar — a white ceremonial scarf — is offered to welcome honoured guests in Bhutan.
            </p>
          </div>
        <footer className={holo.actions}>{actions}</footer>
      </aside>
    </>
  );
}
