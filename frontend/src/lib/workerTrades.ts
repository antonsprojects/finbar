/** Gelijk aan backend `workerTrades.ts` — alleen voor UI-validatie vóór submit. */
export const WORKER_TRADES_MAX_COUNT = 50;
export const WORKER_TRADE_MAX_LEN = 200;

export function normalizeWorkerTradesForSubmit(input: string[]): string[] {
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

/** Weergave in lijsten (komma-gescheiden). */
export function formatWorkerTradesLabel(
  trades: string[] | null | undefined,
): string {
  return (trades ?? []).filter(Boolean).join(", ");
}

/** Voor selectielabels: `" — a, b"` of leeg. */
export function workerTradeSecondarySuffix(
  trades: string[] | null | undefined,
): string {
  const s = formatWorkerTradesLabel(trades);
  return s ? ` — ${s}` : "";
}

export function workerHasTradeMatch(
  trades: string[] | null | undefined,
  queryLower: string,
): boolean {
  if (!queryLower) return false;
  const list = trades ?? [];
  return list.some((t) => t.toLowerCase().includes(queryLower));
}
