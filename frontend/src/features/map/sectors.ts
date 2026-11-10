/**
 * GMC's eight priority sectors, shown in Chamber 3 ("The Economy of Tomorrow").
 *
 * Names and order follow the sector ring on gmc.bt. The summaries and points
 * are short paraphrases of the facts published there — swap in the approved
 * GMC copy before launch.
 */
export interface Sector {
  id: string;
  title: string;
  tagline: string;
  summary: string;
  points: string[];
  /** Icon colour, matched to the gmc.bt illustration for this sector. */
  color: string;
}

export const sectors: Sector[] = [
  {
    id: 'spiritual',
    title: 'Spiritual',
    tagline: 'A Buddhism-inspired spiritual centre',
    summary: 'A global destination for Buddhist spiritual journeys, linked to the wider network of Buddhist sites in the region.',
    points: [
      'Buddhist institutions and meditation centres',
      'City design inspired by the mandala',
      'Green and blue spaces for stillness and reflection',
    ],
    color: '#a8384a',
  },
  {
    id: 'health',
    title: 'Health and Wellness',
    tagline: 'Integrative medicine, life sciences and wellness',
    summary: 'Research in medical science and biotechnology alongside traditional healing, with wellness and mindfulness retreats.',
    points: [
      'Modern medicine combined with traditional practice',
      'Research in biotechnology and preventive health',
      'Retreats for holistic, regenerative living',
    ],
    color: '#c27f86',
  },
  {
    id: 'education',
    title: 'Education and Knowledge',
    tagline: 'A specialised hub for learning and ideas',
    summary: 'Leading institutions brought together to blend Eastern wisdom with Western advances across many disciplines.',
    points: [
      'Universities and research institutes in emerging fields',
      'Think tanks connecting scholars across borders',
      'Lifelong learning and mindful leadership',
    ],
    color: '#e07a45',
  },
  {
    id: 'agritech',
    title: 'Agri-Tech and Forestry',
    tagline: 'A carbon-neutral, socially responsible agri-hub',
    summary: 'Forestry technology for greener construction materials and agri-tech that draws on Bhutan’s biodiversity for sustainable food.',
    points: [
      'Keeping Bhutan’s 70% forest cover commitment',
      'Smart farming for future food security',
      'Support for local farmers and communities',
    ],
    color: '#e3a03a',
  },
  {
    id: 'green-energy',
    title: 'Green Energy and Technologies',
    tagline: 'Green energy and technology, including AI',
    summary: 'A hub for renewable energy — hydropower, solar and geothermal — and emerging green technologies.',
    points: [
      'Renewable power and smart energy systems',
      'Green tech, biotechnology and artificial intelligence',
      'Global companies partnering with local research',
    ],
    color: '#7fa894',
  },
  {
    id: 'finance',
    title: 'Finance and Digital Assets',
    tagline: 'A financial and wealth management hub',
    summary: 'Financial services built on fintech and blockchain, including TER, a token backed by physical gold.',
    points: [
      'Its own legal framework as a Special Administrative Region',
      'Crypto mining powered by clean hydropower',
      'Fully digital, full-reserve banking',
    ],
    color: '#5f9a78',
  },
  {
    id: 'aviation',
    title: 'Aviation and Logistics',
    tagline: 'An integrated aviation and logistics hub',
    summary: 'Gelephu International Airport will link Bhutan to major hubs and serve Northeast India and South Asia.',
    points: [
      'New international airport planned for 2029',
      'Air cargo, warehousing and distribution',
      'Air, road and future rail working together',
    ],
    color: '#424a71',
  },
  {
    id: 'tourism',
    title: 'Tourism',
    tagline: 'Travel that protects nature and culture',
    summary: 'Mindful, sustainable travel built on wellness, eco-conscious journeys and genuine cultural immersion.',
    points: [
      '“Soul-seeking” rather than sightseeing',
      'Close encounters with nature and wildlife',
      'Tourism that supports local livelihoods',
    ],
    color: '#4f7a5a',
  },
];
