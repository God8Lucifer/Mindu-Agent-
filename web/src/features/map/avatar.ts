/**
 * Chamber 4 ("My City. My Future.") — the people a visitor might become in GMC.
 * The lines tie each role to published facts about the city (sectors, bridges,
 * neighbourhoods); they are illustrative, not official copy.
 */
export type PersonaId = 'student' | 'builder' | 'monk' | 'resident' | 'professional';

export interface Persona {
  id: PersonaId;
  title: string;
  /** Short line under the figure. */
  role: string;
  text: string;
}

export const personas: Persona[] = [
  {
    id: 'student',
    title: 'Student',
    role: 'Learning in GMC',
    text: 'Studying at GMC’s universities and knowledge hubs, where Bhutanese wisdom meets ideas from around the world.',
  },
  {
    id: 'builder',
    title: 'Builder',
    role: 'Building GMC',
    text: 'Raising the city by hand — homes, bridges and public spaces made with local wood, stone and bamboo.',
  },
  {
    id: 'monk',
    title: 'Monk',
    role: 'Practising in GMC',
    text: 'Living and practising at the Vajrayana spiritual centre, where visitors crossing the bridge can glimpse monastic life.',
  },
  {
    id: 'resident',
    title: 'Resident',
    role: 'At home in GMC',
    text: 'Living in a mandala neighbourhood, with a shared public space at its heart and paddy fields along the river.',
  },
  {
    id: 'professional',
    title: 'Professional',
    role: 'Working in GMC',
    text: 'Working across GMC’s growing sectors — from finance and digital assets to green energy and technology.',
  },
];

/** How long each figure stays before the next one appears. */
export const PERSONA_MS = 2800;
