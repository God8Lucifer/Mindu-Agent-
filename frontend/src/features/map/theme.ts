/**
 * Colours for the 3D scene. three.js can't read CSS variables or oklch(),
 * so these are hex values derived from the GMC tokens in app/globals.css.
 */
const lightScene = {
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
  // Surroundings (Surroundings.tsx): the town block around ChoeGo GMC, Gelephu
  skyTop: '#c9dbe6',
  horizon: '#f2ece0',
  baseSide: '#a88b70', // edge of the model's base
  townGround: '#e9e4d8', // town ground between buildings
  plot: '#f3efe7', // paving around the building
  footpath: '#d9d3c6',
  asphalt: '#8f939b',
  paint: '#ffffff',
  kerb: ['#2d3a2b', '#f7f4ee'], // black-and-white kerbs, as in Gelephu
  lawn: '#b9cf98',
  canopy: ['#7fa36a', '#6b9160', '#93b47a'],
  trunk: '#8a6f58',
  lamp: '#fff4d6',
  walls: ['#f4efe6', '#efe3cf', '#e9c9c2', '#f2e4bf'],
  roofs: ['#5f8a6a', '#94503f', '#6e7f8c', '#7a6a4f'],
  trim: '#b7743f', // wooden cornice on neighbouring buildings
  windows: '#6f7f8f',
  cars: ['#c7484a', '#f0f0ee', '#3f5f8a', '#5a5f66'],
  hillNear: '#adbd98',
  hillFar: '#c7d0bf',
  stars: false,
};

/** Floor colours per room, keyed by place id. */
const lightZones: Record<string, string> = {
  reception: '#e6dfcc', // warm surface
  chamber1: '#8a91bd', // --tour-navy, lifted
  chamber2: '#8fb3a0', // --chart-2 teal, softened
  chamber3: '#d9c08a', // --tour-accent, lifted
  chamber4: '#a3b597', // --tour-body, lifted
  souvenir: '#cdb8a6', // --tour-brown, lifted
};

/** Night version of the scene, matching the agent's dark theme (navy, warm accents). */
const darkScene: typeof lightScene = {
  background: '#12172a',
  ground: '#1a2036',
  floor: '#262d48',
  wall: '#3a4266',
  outline: '#c9cde0',
  outlineSelected: '#ffffff',
  dimTo: '#1c2238',
  route: '#e9e4d8',
  pillar: '#8a93b8',
  rail: '#c9a58a',
  display: '#0d1120',
  desk: '#e0b765',
  wood: '#8a6f58',
  podium: '#3a4266',
  kiosk: '#0d1120',
  kioskGlow: '#e0b765',
  modelTable: '#3d4a6b',
  holo: '#f08359',
  holoRing: '#f2d44e',
  skyTop: '#070a16',
  horizon: '#1b2140',
  baseSide: '#3b2f2a',
  townGround: '#1c2238',
  plot: '#262d48',
  footpath: '#232a44',
  asphalt: '#141a2c',
  paint: '#8d93ad',
  kerb: ['#0d1120', '#a4aac0'],
  lawn: '#1d2a2c',
  canopy: ['#1f3a2e', '#26443a', '#1a3127'],
  trunk: '#3b2f2a',
  lamp: '#ffc874',
  walls: ['#2c3352', '#30365a', '#3a3048', '#353a52'],
  roofs: ['#1a2a24', '#2e1d1a', '#1c2330', '#262019'],
  trim: '#5a3a24',
  windows: '#ffc874', // lit windows at night
  cars: ['#6b2a2c', '#8d93ad', '#24365a', '#2c3038'],
  hillNear: '#0e1328',
  hillFar: '#141a34',
  stars: true,
};

const darkZones: Record<string, string> = {
  reception: '#4a4a5e',
  chamber1: '#4f5791',
  chamber2: '#3f6b5c',
  chamber3: '#7d6a3e',
  chamber4: '#4f6347',
  souvenir: '#6b5546',
};

/**
 * The map has no theme toggle of its own: it follows the choice made in the agent
 * (data-theme on <html>, set before paint by app/layout.tsx). The 3D scene only
 * renders in the browser, so reading it on access is safe.
 */
const isDark = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';

export const sceneTheme: typeof lightScene = new Proxy(lightScene, {
  get: (_, key: string) => (isDark() ? darkScene : lightScene)[key as keyof typeof lightScene],
});

export const zoneColors: Record<string, string> = new Proxy(lightZones, {
  get: (_, key: string) => (isDark() ? darkZones : lightZones)[key],
});
