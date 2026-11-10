/**
 * Chapters revealed around the butter lamp in Chamber 1 ("The Vision").
 * Built only from the chamber's official caption: light a butter lamp, a 360°
 * theatre where spirituality and nature meet technology, and the Royal Vision.
 *
 * TODO: replace with GMC-approved wording, especially the Royal Vision chapter.
 */
export interface VisionChapter {
  id: 'spirituality' | 'nature' | 'technology' | 'royal-vision';
  title: string;
  tagline: string;
  text: string;
  /** Panel of the 360° band the hotspot sits on (0–15). */
  panel: number;
}

export const visionChapters: VisionChapter[] = [
  {
    id: 'spirituality',
    title: 'Spirituality',
    tagline: 'An offering of light',
    text: 'The journey begins with a butter lamp — a quiet offering of light before you step into the theatre.',
    panel: 0,
  },
  {
    id: 'nature',
    title: 'Nature',
    tagline: 'Forest and wildlife all around you',
    text: 'The theatre opens onto living forest and wildlife — the natural world at the heart of Gelephu Mindfulness City.',
    panel: 4,
  },
  {
    id: 'technology',
    title: 'Technology',
    tagline: 'A 360° immersive theatre',
    text: 'Projection wraps every wall of the room, so spirituality and nature meet technology all around you.',
    panel: 8,
  },
  {
    id: 'royal-vision',
    title: 'The Royal Vision',
    tagline: 'Where the journey leads',
    text: 'The Royal Vision for Gelephu Mindfulness City comes to life — the idea that shapes everything you will see next.',
    panel: 12,
  },
];
