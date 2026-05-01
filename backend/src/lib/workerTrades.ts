/** Maximaal aantal vakgebied-tags per teamlid. */
export const WORKER_TRADES_MAX_COUNT = 50;
/** Max lengte per tag (trimmed). */
export const WORKER_TRADE_MAX_LEN = 200;

/**
 * Normaliseert inkomende tags: trim, lengte-cap, case-insensitive dedupe (nl),
 * behoudt eerste voorkomen-volgorde.
 */
export function normalizeWorkerTradesInput(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seenLower = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const t = raw.trim().slice(0, WORKER_TRADE_MAX_LEN);
    if (!t) continue;
    const k = t.toLocaleLowerCase("nl-NL");
    if (seenLower.has(k)) continue;
    seenLower.add(k);
    out.push(t);
    if (out.length >= WORKER_TRADES_MAX_COUNT) break;
  }
  return out;
}
