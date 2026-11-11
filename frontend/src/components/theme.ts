'use client';

import { useSyncExternalStore } from 'react';

/** Light / dark, shared by every page (and the agent in public/agent): data-theme on <html>, saved as "mindu-theme". */
export type Theme = 'light' | 'dark';
const KEY = 'mindu-theme';

function read(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}

/** The current theme; re-renders when it changes. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => 'light');
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* private mode */ }
}
