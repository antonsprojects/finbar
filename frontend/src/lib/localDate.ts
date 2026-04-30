/** Lokale kalenderdag als `YYYY-MM-DD` (geen UTC-shift). */
export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysFromYmd(ymd: string, add: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + add);
  return formatLocalYmd(dt);
}

export function inclusiveYmdRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDaysFromYmd(d, 1)) {
    out.push(d);
  }
  return out;
}

/** Maandag 00:00 van de ISO-week die `d` bevat (lokale kalender, middag om DST te ontwijken). */
function startOfIsoWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const dayMon0 = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dayMon0);
  return x;
}

/**
 * ISO 8601 week number (1–53) for **local** calendar date (Ma–Zo, week 1 = week met 4 jan).
 */
export function isoWeekNumberForLocalDate(d: Date): number {
  const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  const monday = startOfIsoWeekMonday(noon);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const week1Monday = startOfIsoWeekMonday(
    new Date(isoYear, 0, 4, 12, 0, 0),
  );
  const diffDays = Math.round(
    (monday.getTime() - week1Monday.getTime()) / 86400000,
  );
  return diffDays / 7 + 1;
}
