import type { WorkerAvailabilityRow } from "@/stores/workerAvailability";

function parseYmdLocal(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * `weekday` = `Date.getDay()` (0=zondag … 6=zaterdag).
 * Eerste `count` voorkomens vanaf `from` (weekelijks).
 */
export function upcomingWeekdayDates(
  weekday: number,
  count: number,
  from: Date = new Date(),
): string[] {
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  while (cur.getDay() !== weekday) {
    cur.setDate(cur.getDate() + 1);
  }
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(formatLocalYmd(cur));
    cur.setDate(cur.getDate() + 7);
  }
  return out;
}

export function formatOneOffLine(r: WorkerAvailabilityRow): string {
  const d = parseYmdLocal(r.date);
  const long = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
  const note = r.notes?.trim();
  return note ? `${long} · ${note}` : `${long} · niet beschikbaar`;
}

const WEEKDAY_NL = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
] as const;

export function formatWeekdayRecurringLabel(
  weekday: number,
  notes: string | null,
): string {
  const day = WEEKDAY_NL[weekday] ?? "dag";
  const n = notes?.trim();
  return n ? `Elke ${day} · ${n}` : `Elke ${day}`;
}

export type RecurringUnavailabilityGroup = {
  weekday: number;
  notes: string | null;
  rowIds: string[];
};

/**
 * Splits UNAVAILABLE rijen: ≥ `minRecurring` keer dezelfde weekdag + notitie → herhaald patroon.
 */
export function partitionUnavailableForLists(
  rows: WorkerAvailabilityRow[],
  minRecurring = 3,
): {
  oneOff: WorkerAvailabilityRow[];
  recurringGroups: RecurringUnavailabilityGroup[];
} {
  const unavail = rows.filter((r) => r.status === "UNAVAILABLE");
  const byKey = new Map<string, WorkerAvailabilityRow[]>();

  for (const r of unavail) {
    const d = parseYmdLocal(r.date);
    const w = d.getDay();
    const nk = (r.notes ?? "").trim();
    const key = `${w}|${nk}`;
    const arr = byKey.get(key) ?? [];
    arr.push(r);
    byKey.set(key, arr);
  }

  const recurringGroups: RecurringUnavailabilityGroup[] = [];
  const used = new Set<string>();

  for (const arr of byKey.values()) {
    if (arr.length >= minRecurring) {
      const d = parseYmdLocal(arr[0].date);
      recurringGroups.push({
        weekday: d.getDay(),
        notes: arr[0].notes,
        rowIds: arr.map((x) => x.id),
      });
      for (const r of arr) used.add(r.id);
    }
  }

  recurringGroups.sort((a, b) => {
    const order = (x: number) => (x + 6) % 7;
    return order(a.weekday) - order(b.weekday);
  });

  const oneOff = unavail.filter((r) => !used.has(r.id));
  oneOff.sort((a, b) => a.date.localeCompare(b.date));

  return { oneOff, recurringGroups };
}
