'use client';

import styles from './pageNav.module.css';
import { setTheme, useTheme } from './theme';

/**
 * Top-right bar on every page except the guide itself: light/dark toggle and
 * "← Back to GMC". `back` is where the guide was left (restores its chat), else "/".
 */
export function PageNav({ back }: { back?: string | null }) {
  const theme = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <nav className={styles.nav} aria-label="Page">
      <button type="button" className={styles.theme} onClick={() => setTheme(next)} aria-label={`Switch to ${next} mode`} title="Light / dark mode">
        {theme === 'dark' ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></svg>
        )}
      </button>
      <a href={back ?? '/'} className={styles.back}>← Back to GMC</a>
    </nav>
  );
}
