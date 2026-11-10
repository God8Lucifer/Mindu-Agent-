import type { Chamber } from './chambers';

export type CoverRequest = {
  /** Chambers the visitor photographed, with their kept photos (JPEG, 1080×1350, frame included). */
  chambers: { chamber: Chamber; photos: Blob[] }[];
  /** e.g. "10 November 2026" */
  date: string;
};

/**
 * AI cover hook — to be filled in by the AI side of the team.
 *
 * Return a cover image (any size; it is cropped to fill 1080×780) or `null`
 * to fall back to the built-in GMC template cover. Keep it quick: the visitor
 * is waiting on the "Building your collection" screen, and the template
 * cover is used automatically if this throws or takes longer than the timeout.
 *
 * Example once a backend exists:
 *   const body = new FormData();
 *   req.chambers.forEach(c => c.photos.forEach(p => body.append(c.chamber.id, p)));
 *   const res = await fetch('/api/photo/cover', { method: 'POST', body, signal });
 *   return res.ok ? await res.blob() : null;
 */
export async function generateAiCover(req: CoverRequest, signal: AbortSignal): Promise<Blob | null> {
  void req; void signal;
  return null;
}

/** How long to wait for the AI cover before using the template one. */
export const AI_COVER_TIMEOUT_MS = 12_000;
