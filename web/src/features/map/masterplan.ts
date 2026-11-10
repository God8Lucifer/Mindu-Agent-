/**
 * Chamber 2 ("Urban Blueprint") hologram: a stylised model of the Gelephu
 * Mindfulness City masterplan by BIG with Arup and Cistri.
 *
 * Content is paraphrased from published coverage of the masterplan
 * (The Bhutanese, Dezeen, Domus). It is a simplified illustration, not the
 * official drawing. The five layers are taken from the masterplan itself; swap
 * in the Experience Centre's official "five pillars" when GMC confirms them.
 */

export type PlanLayerId = 'water' | 'neighbourhoods' | 'bridges' | 'energy' | 'connections';

export interface PlanLayer {
  id: PlanLayerId;
  title: string;
  tagline: string;
  text: string;
  /** Chip / highlight colour (GMC logo palette, plus a water blue). */
  color: string;
}

export const planLayers: PlanLayer[] = [
  {
    id: 'water',
    title: 'Rivers & paddy fields',
    tagline: 'Water shapes the city',
    text: 'Around 35 rivers and streams run north to south through the site. Paddy fields line them to protect against monsoon floods, and double as corridors for wildlife — leaving elephant migration routes undisturbed.',
    color: '#5fb4e0',
  },
  {
    id: 'neighbourhoods',
    title: 'Mandala neighbourhoods',
    tagline: 'Eleven ribbons between the rivers',
    text: 'Eleven ribbon-like neighbourhoods sit between the rivers and step down from the hills to the valley like terraced fields. Each is arranged around a central public space following mandala principles, growing denser from north to south.',
    color: 'rgb(240, 131, 89)',
  },
  {
    id: 'bridges',
    title: 'Inhabitable bridges',
    tagline: 'Crossings that are also places',
    text: 'Bridges across the rivers link the neighbourhoods and carry transport — and each also houses a public building. Tap a glowing bridge on the model to see what it holds.',
    color: 'rgb(242, 212, 78)',
  },
  {
    id: 'energy',
    title: 'Clean energy',
    tagline: 'The Sankosh Temple-Dam',
    text: 'On the western edge, a hydroelectric dam doubles as a landmark: a stepped retaining wall with viewpoints and staircases, and a temple and visitor centre built into its cliff face.',
    color: 'rgb(122, 51, 60)',
  },
  {
    id: 'connections',
    title: 'Connections',
    tagline: 'Linked to the region and the world',
    text: 'A new international airport and railway connections tie Gelephu to the region, with the airport as one of the main crossings linking the neighbourhoods.',
    color: 'rgb(67, 74, 113)',
  },
];

export interface PlanBridge {
  id: string;
  title: string;
  text: string;
  /** Position on the model (local units: x east–west, z north–south) and span. */
  x: number;
  z: number;
  length: number;
}

export const planBridges: PlanBridge[] = [
  { id: 'vajrayana', title: 'Vajrayana spiritual centre', text: 'A bridge where visitors can glimpse monastic life and mindfulness practice as they cross.', x: -2.3, z: -0.9, length: 1.9 },
  { id: 'healthcare', title: 'Healthcare centre', text: 'A hospital bridge that brings Eastern and Western medicine together.', x: 1.9, z: 0.0, length: 1.8 },
  { id: 'university', title: 'University', text: 'A university bridge that puts academic life on show to everyone passing through.', x: -0.4, z: 0.9, length: 2.1 },
  { id: 'greenhouse', title: 'Greenhouse', text: 'Hydroponic and aquaponic farming that shows commuters traditional and modern agriculture side by side.', x: 3.1, z: 1.6, length: 1.7 },
  { id: 'cultural', title: 'Cultural centre', text: 'A bridge that introduces visitors to Bhutanese culture and customs.', x: -3.0, z: 2.0, length: 1.8 },
  { id: 'market', title: 'Market', text: 'A market bridge featuring Bhutanese textiles.', x: 0.9, z: 2.6, length: 2.0 },
];

/** Model footprint (local units). North is −z, matching the map. */
export const PLAN_W = 10;
export const PLAN_D = 7;
export const RIVER_COUNT = 12; // 12 rivers → 11 neighbourhood ribbons

export const riverX = (i: number, z: number) =>
  -PLAN_W / 2 + 0.4 + (i * (PLAN_W - 0.8)) / (RIVER_COUNT - 1) + 0.18 * Math.sin(z * 1.4 + i * 1.7);

/** Terrain height: forested hills to the north stepping down to the valley. */
export function planHeight(x: number, z: number) {
  const t = Math.min(1, Math.max(0, (0.6 - z) / 4)); // 1 at the north edge, 0 in the valley
  const north = t * t * (3 - 2 * t);
  return 0.06 + north * (0.85 + 0.3 * Math.sin(x * 1.3) + 0.15 * Math.sin(x * 3.1 + z * 2));
}
