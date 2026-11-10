/**
 * Colours for the 3D scene. three.js can't read CSS variables or oklch(),
 * so these are hex values derived from the GMC tokens in app/globals.css.
 */
export const sceneTheme = {
  background: '#f5f1e8', // --tour-surface
  ground: '#ebe5d6',
  floor: '#fbf9f4',
  wall: '#ffffff', // --tour-card
  outline: '#2d3a2b', // --tour-ink
  outlineSelected: '#000000',
  dimTo: '#efebe1',
  route: '#2d3a2b', // --tour-ink
  pillar: '#4a5d43', // --tour-body
  rail: '#6b5444', // --tour-brown
  display: '#2d3a2b', // --tour-ink
  desk: '#c9a961', // --tour-accent
  wood: '#a88b70', // lighter --tour-brown
  podium: '#ffffff',
  kiosk: '#2d3a2b',
  kioskGlow: '#c9a961',
  modelTable: '#4a5d43', // --tour-body
  holo: '#f08359', // hologram beam (GMC logo orange)
  holoRing: '#f2d44e', // hologram rings (GMC logo yellow)
};

/** Floor colours per room, keyed by place id. */
export const zoneColors: Record<string, string> = {
  reception: '#e6dfcc', // warm surface
  chamber1: '#8a91bd', // --tour-navy, lifted
  chamber2: '#8fb3a0', // --chart-2 teal, softened
  chamber3: '#d9c08a', // --tour-accent, lifted
  chamber4: '#a3b597', // --tour-body, lifted
  souvenir: '#cdb8a6', // --tour-brown, lifted
};
