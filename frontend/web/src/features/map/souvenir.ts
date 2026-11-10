/**
 * Items that float out of the Souvenir Shop hologram. They are the kinds of
 * things visible in the shop renders (textiles, clothing, tea set, elephant
 * figure) plus the visitor's Future Postcard. Illustrative only — the shop's
 * actual stock may differ.
 */
export type SouvenirId = 'textile' | 'clothing' | 'tea' | 'elephant' | 'postcard';

export interface Souvenir {
  id: SouvenirId;
  title: string;
  tagline: string;
  text: string;
}

export const souvenirs: Souvenir[] = [
  {
    id: 'textile',
    title: 'Handwoven textiles',
    tagline: 'Woven in Bhutan',
    text: 'Bright woven patterns like the textiles hanging in the shop window — a piece of Bhutanese craft to take home.',
  },
  {
    id: 'clothing',
    title: 'Gho & kira',
    tagline: 'National dress',
    text: 'The national dress worn by your hosts at Reception, in the shop’s range of clothing.',
  },
  {
    id: 'tea',
    title: 'Tea set',
    tagline: 'For quiet moments',
    text: 'Cups and teapots like those on the shop shelves — a mindful ritual for home.',
  },
  {
    id: 'elephant',
    title: 'Elephant figure',
    tagline: 'A nod to the land',
    text: 'Elephants still roam the Gelephu region; the masterplan keeps their migration routes clear.',
  },
  {
    id: 'postcard',
    title: 'Your Future Postcard',
    tagline: 'Made by you',
    text: 'The postcard you create on your visit, with your own reflection on GMC’s future — pin a copy on the Postcard Board too.',
  },
];
