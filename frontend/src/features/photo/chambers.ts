import { chamberIds, places } from '@/features/map/layout-data';

export type Chamber = { id: string; number: string; name: string };

/** The four chambers, in visiting order, each with its badge number and name. */
export const chambers: Chamber[] = chamberIds.map(id => {
  const p = places.find(pl => pl.id === id);
  return { id, number: p?.badge ?? '', name: p?.name ?? id };
});

/** How many photos a visitor takes in each chamber. */
export const SHOTS_PER_CHAMBER = 3;

export const isChamber = (id: string | undefined | null): id is string =>
  !!id && chambers.some(c => c.id === id);
