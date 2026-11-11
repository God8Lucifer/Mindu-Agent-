/**
 * GMC Experience Centre layout, traced from the "GMC EXPERIENCE CENTRE LAYOUT"
 * floor plan (1010 × 594 px image). All coordinates below are in plan pixels
 * (x → right, y → down) so they can be checked against the drawing directly.
 * `toWorld` in geometry.ts converts them to 3D metres-ish units.
 *
 * To adjust a room, move its points here — nothing else needs to change.
 */

import type { ScreenArt, WallFinish } from './textures';

export type Pt = readonly [number, number];

export type PlaceCategory = 'chamber' | 'service' | 'shop' | 'access';

export interface Place {
  id: string;
  name: string;
  /** Badge text shown on the map (chamber number or plan letter). */
  badge?: string;
  /** Icon shown in the badge instead of text. */
  icon?: 'bag';
  category: PlaceCategory;
  description: string;
  /** Floor area if the plan states one. */
  area?: string;
  /** Where the label sits and where the camera flies to. */
  anchor: Pt;
  /** Floor zone, if the place is a room. */
  zone?: Pt[];
  /** Optional hologram popup for this place, replacing the standard card. */
  feature?: 'sectors' | 'vision' | 'masterplan' | 'avatar' | 'welcome' | 'souvenir';
  /** Title used in that popup when it differs from the map label. */
  headline?: string;
  /** Where a hologram projects from (the table), if not the anchor. */
  holoAt?: Pt;
  /** Height the hologram beam starts at: a table top, or the floor. */
  holoBase?: number;
  /** Height the beam reaches (where the hologram sits). Defaults to HOLO_HEIGHT. */
  holoHeight?: number;
  /** Height of the floating title, if different from holoHeight. */
  holoLabelHeight?: number;
}

export const categoryLabels: Record<PlaceCategory, string> = {
  chamber: 'Chambers',
  service: 'Visitor services',
  shop: 'Shop',
  access: 'Entrances & exits',
};

/** Points along a circular arc, angles in degrees (0° = right, 90° = down). */
export function arc(cx: number, cy: number, r: number, from: number, to: number, steps = 12): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

// Chamber 3 is a round lobe; this is its centre and radius on the plan.
const LOBE = { cx: 268, cy: 470, r: 58 };

export const places: Place[] = [
  {
    id: 'entrance',
    name: 'Entrance',
    category: 'access',
    description: 'Start here. Have your ticket code ready for the reception screen.',
    anchor: [818, 370],
  },
  {
    id: 'reception',
    name: 'Welcome Reception',
    badge: 'A',
    category: 'service',
    feature: 'welcome',
    headline: 'Welcome',
    holoAt: [705, 345],
    holoBase: 0.9,
    holoHeight: 2.4,
    holoLabelHeight: 4.9,
    area: '50 m²',
    description: 'Scan or enter your ticket at the reception screen to meet your GMC guide and start your personalised route. The painted map wall here is where Future Postcards go.',
    anchor: [705, 345],
    zone: [[600, 290], [818, 290], [818, 420], [600, 420]],
  },
  {
    id: 'chamber1',
    name: 'The Vision',
    badge: '1',
    category: 'chamber',
    description: 'Light a butter lamp and step into a breathtaking 360° immersive theatre, where spirituality and nature meet technology — and the Royal Vision comes to life.',
    feature: 'vision',
    holoAt: [696, 472],
    holoBase: 0.15,
    anchor: [696, 472],
    zone: [[612, 420], [780, 420], [780, 525], [612, 525]],
  },
  {
    id: 'chamber2',
    name: 'Urban Blueprint',
    badge: '2',
    category: 'chamber',
    feature: 'masterplan',
    holoAt: [481, 510],
    holoBase: 0.45,
    holoHeight: 3.2,
    holoLabelHeight: 8.2,
    description: 'See Gelephu Mindfulness City take shape through spectacular 3D projection mapping. Explore the interactive city model and discover the five pillars behind its design and development.',
    anchor: [480, 470],
    zone: [[370, 470], [600, 470], [600, 515], ...arc(570, 515, 30, 0, 90, 8), ...arc(400, 515, 30, 90, 180, 8)],
  },
  {
    id: 'chamber3',
    name: 'The Economy of Tomorrow',
    category: 'chamber',
    badge: '3',
    description: 'Choose what interests you most and discover the eight future-focused sectors shaping GMC’s economy and opportunities.',
    feature: 'sectors',
    holoAt: [268, 478],
    anchor: [268, 465],
    zone: arc(LOBE.cx, LOBE.cy, LOBE.r, 0, 360, 48),
  },
  {
    id: 'chamber4',
    name: 'My City. My Future.',
    badge: '4',
    category: 'chamber',
    feature: 'avatar',
    holoAt: [485, 330],
    holoBase: 1.05,
    holoHeight: 3.0,
    holoLabelHeight: 4.7,
    description: 'Unlock your personalised avatar and see yourself become part of Gelephu Mindfulness City.',
    anchor: [485, 318],
    zone: [[370, 345], [370, 315], ...arc(400, 315, 30, 180, 270, 8), ...arc(570, 315, 30, 270, 360, 8), [600, 345]],
  },
  {
    id: 'ai',
    name: 'AI Assistant',
    category: 'service',
    description: 'Ask GMC anything about what you have just seen, or leave a question for a human guide.',
    anchor: [626, 400],
  },
  {
    id: 'postcard',
    name: 'Postcard Board',
    category: 'service',
    description: 'Write your reflection and pin your personalised Future Postcard before you leave.',
    anchor: [688, 300],
  },
  {
    id: 'souvenir',
    name: 'Souvenir Shop',
    icon: 'bag',
    category: 'shop',
    area: '40 m²',
    description: 'Take a piece of GMC home with you.',
    feature: 'souvenir',
    headline: 'Take GMC home',
    holoAt: [779, 215],
    holoBase: 0.9,
    holoHeight: 2.6,
    holoLabelHeight: 5.2,
    anchor: [779, 215],
    zone: [[740, 140], [818, 140], [818, 290], [740, 290]],
  },
  {
    id: 'exit',
    name: 'Exit',
    category: 'access',
    description: 'The visit ends here. Thanks for coming!',
    anchor: [818, 78],
  },
  {
    id: 'fire-exit',
    name: 'Fire Exit',
    category: 'access',
    description: 'Emergency exit only.',
    anchor: [262, 388],
  },
];

/** Neutral floor areas that are not selectable places. */
export const floorZones: Pt[][] = [
  // Main hall linking chambers 2, 3 and 4, plus the fire-exit corner.
  [[300, 345], [600, 345], [600, 485], [318, 485], [224, 433], [258, 392]],
  // Corridor to the exit, north of the souvenir shop.
  [[740, 30], [818, 30], [818, 140], [740, 140]],
];

/**
 * Walls as open polylines, each with a surface finish (see textures.ts).
 * Gaps between them are the doorways: entrance (east), exit (north-east),
 * fire exit (north-west), reception → chamber 1, chamber 1 → hall, hall ↔ reception.
 * Runs are split where the finish changes, at points where the wall runs straight on.
 */
export interface Wall {
  finish: WallFinish;
  points: Pt[];
}

export const walls: Wall[] = [
  // Reception north/west and the souvenir shop's west side: timber panelling.
  { finish: 'timber', points: [[600, 345], [600, 290], [740, 290], [740, 140]] },
  // Exit corridor.
  { finish: 'plaster', points: [[740, 140], [740, 30], [818, 30], [818, 60]] },
  // East wall between the exit and the entrance.
  { finish: 'timber', points: [[818, 95], [818, 350]] },
  // Street front round chamber 1: stone with timber-framed marble panels.
  { finish: 'stoneFacade', points: [[818, 390], [818, 420], [780, 420], [780, 525], [612, 525], [612, 468], [600, 468], [600, 515]] },
  // Curved chamber 2 bay: brown wood band.
  { finish: 'woodBand', points: [[600, 515], ...arc(570, 515, 30, 0, 90, 8), ...arc(400, 515, 30, 90, 180, 8)] },
  // Chamber 3 lobe: white plaster.
  { finish: 'plaster', points: [[370, 515], [370, 485], [324, 485], ...arc(LOBE.cx, LOBE.cy, LOBE.r, 15, 220, 24), [250, 402]] },
  // Past the fire exit, along the chamber 4 bay: stone.
  { finish: 'stone', points: [[269, 380], [300, 345], [370, 345], [370, 315], ...arc(400, 315, 30, 180, 270, 8), ...arc(570, 315, 30, 270, 360, 8), [600, 315]] },
  // Partition between reception and chamber 1 (door at its east end).
  { finish: 'timber', points: [[612, 420], [740, 420]] },
];

/** Projection screens and feature walls inside the rooms (see textures.ts). */
export interface Screen {
  art: ScreenArt;
  points: Pt[];
  height: number;
  /** 'stretch' shows the art once; 'metres' tiles it like a wall finish. */
  uv: 'stretch' | 'metres';
  /** How strongly it glows (projections light themselves). */
  glow: number;
  /** Stays dark until the visitor lights the butter lamp in this chamber. */
  litBy?: string;
}

export const screens: Screen[] = [
  // Chamber 1: 360° forest-and-wildlife theatre, dark until the butter lamp is lit.
  { art: 'forest', points: [[616, 472], [616, 521], [776, 521], [776, 424], [616, 424]], height: 1.45, uv: 'stretch', glow: 0.75, litBy: 'chamber1' },
  // Chamber 2: curved mountain-valley projection above the city model.
  { art: 'mountains', points: [[596, 482], ...arc(570, 515, 26, 0, 90, 8), ...arc(400, 515, 26, 90, 180, 8), [374, 482]], height: 1.4, uv: 'stretch', glow: 0.6 },
  // Chamber 3: green sector projection round the lobe.
  { art: 'sectorGreen', points: arc(LOBE.cx, LOBE.cy, LOBE.r - 5, 40, 205, 20), height: 1.4, uv: 'stretch', glow: 0.6 },
  // Chamber 4: city courtyard panorama (the avatar wall).
  { art: 'cityLife', points: [[374, 343], [374, 315], ...arc(400, 315, 26, 180, 270, 8), ...arc(570, 315, 26, 270, 360, 8), [596, 343]], height: 1.45, uv: 'stretch', glow: 0.6 },
  // Reception: checkered postcard / feature wall and sage fabric panels.
  { art: 'checker', points: [[650, 294.5], [726, 294.5]], height: 1.45, uv: 'metres', glow: 0 },
  { art: 'sageFabric', points: [[604, 340], [604, 294.5], [645, 294.5]], height: 1.45, uv: 'metres', glow: 0 },
];

export const pillars: Pt[] = [[357, 408], [606, 408], [730, 410]];

/** Low display rails splitting the hall into the outbound and return paths. */
export const rails: [Pt, Pt][] = [
  [[365, 408], [395, 408]],
  [[430, 408], [455, 408]],
  [[510, 408], [550, 408]],
  [[568, 408], [592, 408]],
];

/** Suggested visitor route, following the arrows on the plan. */
export const route: Pt[] = [
  [845, 370], [760, 370], [760, 400], [760, 440], [700, 470], [640, 448], [590, 445],
  [480, 445], [380, 445], [292, 460], [300, 395], [380, 370], [485, 362], [590, 370],
  [626, 388], [668, 312], [779, 312], [779, 215], [779, 78], [845, 78],
];

/** Order the visitor meets each place along the route. */
export const routeOrder = ['entrance', 'reception', 'chamber1', 'chamber2', 'chamber3', 'chamber4', 'ai', 'postcard', 'souvenir', 'exit'];

export const chamberIds = places.filter(p => p.category === 'chamber').map(p => p.id);
