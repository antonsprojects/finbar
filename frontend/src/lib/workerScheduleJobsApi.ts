import type { JobStatus } from "@/stores/jobs";

type ApiErrorJson = { error?: { message?: string } };

function readApiErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const e = (json as ApiErrorJson).error;
  if (e && typeof e === "object" && typeof e.message === "string") {
    return e.message;
  }
  return undefined;
}

export type WorkerScheduleJobRow = {
  job: { id: string; name: string; status: JobStatus };
  assignmentCount: number;
};

export async function fetchWorkerScheduleJobs(
  workerId: string,
): Promise<WorkerScheduleJobRow[]> {
  const r = await fetch(
    `/api/workers/${encodeURIComponent(workerId)}/schedule-jobs`,
    { credentials: "include" },
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      readApiErrorMessage(data) ?? "Kon projecten niet laden",
    );
  }
  const payload = data as { data?: { jobs?: WorkerScheduleJobRow[] } };
  return payload.data?.jobs ?? [];
}

/** Verwijdert teamlid van het project; alleen als er nog geen ingeplande dagen zijn. */
export async function removeWorkerFromScheduleJob(
  workerId: string,
  jobId: string,
): Promise<number> {
  const r = await fetch(
    `/api/workers/${encodeURIComponent(workerId)}/schedule-jobs/${encodeURIComponent(jobId)}`,
    { method: "DELETE", credentials: "include" },
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      readApiErrorMessage(data) ?? "Kon niet verwijderen",
    );
  }
  const payload = data as { data?: { deleted?: number } };
  return payload.data?.deleted ?? 0;
}
