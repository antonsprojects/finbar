import type { ScheduleAssignmentRow } from "@/stores/scheduleAssignments";

type ApiErrorJson = { error?: { message?: string } };

function readApiErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const e = (json as ApiErrorJson).error;
  if (e && typeof e === "object" && typeof e.message === "string") {
    return e.message;
  }
  return undefined;
}

/**
 * Inplanningen met notitie voor een teamlid, oplopend op kalenderdag.
 */
export async function fetchWorkerScheduleNoteRows(input: {
  workerId: string;
  /** Alleen inplanningen op dit project (bijv. /projects/:id/workers/…). */
  jobId?: string;
}): Promise<ScheduleAssignmentRow[]> {
  const from = "2000-01-01";
  const to = "2100-12-31";
  const q = new URLSearchParams({
    from,
    to,
    limit: "500",
    offset: "0",
    workerId: input.workerId,
  });
  if (input.jobId) {
    q.set("jobId", input.jobId);
  }
  const r = await fetch(`/api/schedule-assignments?${q}`, {
    credentials: "include",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      readApiErrorMessage(data) ?? "Kon inplanningsnotities niet laden",
    );
  }
  const payload = data as {
    data?: { items?: ScheduleAssignmentRow[] };
  };
  const items = payload.data?.items ?? [];
  return items
    .filter((a) => (a.notes ?? "").trim())
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function formatScheduleNoteDateYmd(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return ymd;
  }
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
