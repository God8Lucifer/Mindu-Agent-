'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './holo.module.css';

/** One readable, scrollable description panel shared by every chamber. */
export function ChamberPanel({ title, resetKey, className = '', children }: {
  title: string;
  resetKey?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: 0, behavior: 'instant' }); }, [resetKey]);
  return (
    <aside ref={ref} className={`${styles.card} ${styles.chamberPanel} ${className}`} data-chamber-panel aria-label={`${title} details`} aria-live="polite" tabIndex={0}>
      {children}
    </aside>
  );
}
