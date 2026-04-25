import {
  WorkerAvailabilityPeriodKind,
  WorkerAvailabilityStatus,
  type WorkerAvailability,
  type WorkerAvailabilityPeriod,
} from "@prisma/client";

const WEEKDAY_NL = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
] as const;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function longDate(ymdStr: string): string {
  const parts = ymdStr.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const d = parts[2]!;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export function lineForPeriod(p: WorkerAvailabilityPeriod): string {
  const fromY = ymd(p.dateFrom);
  const fromL = longDate(fromY);
  if (p.kind === WorkerAvailabilityPeriodKind.FIXED_SHIFT) {
    if (p.dateTo == null) {
      return `Van ${fromL} · einddatum onbepaald`;
    }
    const toY = ymd(p.dateTo);
    if (fromY === toY) {
      return `${fromL} · vaste dienst`;
    }
    return `Van ${fromL} t/m ${longDate(toY)} · vaste dienst`;
  }
  if (p.dateTo == null) {
    return fromL;
  }
  const toY = ymd(p.dateTo);
  if (fromY === toY) {
    return `${fromL} · deeltijd`;
  }
  return `${fromL} – ${longDate(toY)} · deeltijd`;
}

export function availabilityLineForWorker(
  periods: WorkerAvailabilityPeriod[],
): string | null {
  if (periods.length === 0) {
    return null;
  }
  return periods.map(lineForPeriod).join(" · ");
}

type Unavail = Pick<
  WorkerAvailability,
  "id" | "date" | "status" | "notes"
>;

function formatOneOffLine(r: Unavail): string {
  const long = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(r.date);
  const note = r.notes?.trim();
  return note ? `${long} · ${note}` : `${long} · niet beschikbaar`;
}

function formatRecurring(weekday: number, notes: string | null): string {
  const day = WEEKDAY_NL[weekday] ?? "dag";
  const n = notes?.trim();
  return n ? `Elke ${day} · ${n}` : `Elke ${day}`;
}

type RecurGroup = { weekday: number; notes: string | null; rows: Unavail[] };

const MIN_RECUR = 3;

export function absenceLinesForWorker(rows: Unavail[]): string[] {
  const unavail = rows.filter(
    (r) => r.status === WorkerAvailabilityStatus.UNAVAILABLE,
  );
  if (unavail.length === 0) {
    return [];
  }
  const byKey = new Map<string, Unavail[]>();
  for (const r of unavail) {
    const w = r.date.getDay();
    const nk = (r.notes ?? "").trim();
    const key = `${w}|${nk}`;
    const arr = byKey.get(key) ?? [];
    arr.push(r);
    byKey.set(key, arr);
  }
  const recurring: RecurGroup[] = [];
  const usedId = new Set<string>();
  for (const arr of byKey.values()) {
    if (arr.length >= MIN_RECUR) {
      const first = arr[0]!;
      const w = first.date.getDay();
      recurring.push({
        weekday: w,
        notes: first.notes,
        rows: arr,
      });
      for (const x of arr) {
        usedId.add(x.id);
      }
    }
  }
  recurring.sort((a, b) => {
    const order = (x: number) => (x + 6) % 7;
    return order(a.weekday) - order(b.weekday);
  });
  const oneOff = unavail
    .filter((r) => !usedId.has(r.id))
    .sort((a, b) => ymd(a.date).localeCompare(ymd(b.date)));

  const out: string[] = [];
  for (const g of recurring) {
    out.push(formatRecurring(g.weekday, g.notes));
  }
  for (const r of oneOff) {
    out.push(formatOneOffLine(r));
  }
  return out;
}

export type TeamDisplayRule = {
  availability: string | null;
  /** Regels in volgorde: eerst vaste weekdagen, daarna losse dagen. */
  absence: string[];
};

export function buildTeamDisplayRule(
  periods: WorkerAvailabilityPeriod[],
  unavail: Unavail[],
): TeamDisplayRule {
  return {
    availability: availabilityLineForWorker(periods),
    absence: absenceLinesForWorker(unavail),
  };
}
