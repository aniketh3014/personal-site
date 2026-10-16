const WORDS_PER_MINUTE = 220;

/** Estimated reading time in whole minutes (minimum 1) for a raw Markdown body. */
export function getReadingTime(body: string | undefined): number {
  const words = (body ?? "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
