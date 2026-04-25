import { defineStore } from "pinia";
import { ref } from "vue";

export type JobStatus =
  | "PLANNING"
  | "ACTIVE"
  | "COMPLETED"
  | "ARCHIVED";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Actief",
  COMPLETED: "Afgerond",
  ARCHIVED: "Gearchiveerd",
};

export type Job = {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  status: JobStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiErrorJson = { error?: { message?: string } };

function readApiErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const e = (json as ApiErrorJson).error;
  if (e && typeof e === "object" && typeof e.message === "string") {
    return e.message;
  }
  return undefined;
}

const jsonHeaders = { "Content-Type": "application/json" };

export const useJobsStore = defineStore("jobs", () => {
  const list = ref<Job[]>([]);
  const listLoading = ref(false);
  const listError = ref("");
  /** Latest job payload by id (fetch + update) so shells like ProjectLayout stay in sync after PATCH. */
  const detailById = ref<Record<string, Job>>({});
  /** Worker ids with ≥1 schedule row on that job (from GET …/scheduled-workers). */
  const scheduledWorkerIdsByJobId = ref<Record<string, string[]>>({});

  async function fetchList(status?: JobStatus) {
    listLoading.value = true;
    listError.value = "";
    try {
      const q = new URLSearchParams({ limit: "50", offset: "0" });
      if (status) q.set("status", status);
      const r = await fetch(`/api/jobs?${q}`, { credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(readApiErrorMessage(data) ?? "Kon projecten niet laden");
      }
      const payload = data as {
        data?: { items?: Job[] };
      };
      list.value = payload.data?.items ?? [];
    } catch (e) {
      list.value = [];
      listError.value = e instanceof Error ? e.message : "Kon projecten niet laden";
    } finally {
      listLoading.value = false;
    }
  }

  async function fetchJob(id: string): Promise<Job | null> {
    const r = await fetch(`/api/jobs/${id}`, { credentials: "include" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Project niet gevonden");
    }
    const payload = data as { data?: { job: Job } };
    const job = payload.data?.job ?? null;
    if (job) {
      detailById.value = { ...detailById.value, [id]: job };
    }
    return job;
  }

  async function fetchScheduledWorkerIds(jobId: string): Promise<string[]> {
    const r = await fetch(`/api/jobs/${jobId}/scheduled-workers`, {
      credentials: "include",
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(
        readApiErrorMessage(data) ?? "Kon projectteam niet laden",
      );
    }
    const payload = data as { data?: { workerIds?: string[] } };
    const ids = payload.data?.workerIds ?? [];
    scheduledWorkerIdsByJobId.value = {
      ...scheduledWorkerIdsByJobId.value,
      [jobId]: ids,
    };
    return ids;
  }

  async function createJob(input: {
    name: string;
    address?: string | null;
    notes?: string | null;
    status?: JobStatus;
  }): Promise<Job> {
    const r = await fetch("/api/jobs", {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Kon project niet aanmaken");
    }
    const payload = data as { data?: { job: Job } };
    if (!payload.data?.job) {
      throw new Error("Ongeldig antwoord");
    }
    return payload.data.job;
  }

  async function updateJob(
    id: string,
    patch: Partial<{
      name: string;
      address: string | null;
      notes: string | null;
      status: JobStatus;
    }>,
  ): Promise<Job> {
    const r = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify(patch),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Kon project niet bijwerken");
    }
    const payload = data as { data?: { job: Job } };
    if (!payload.data?.job) {
      throw new Error("Ongeldig antwoord");
    }
    const job = payload.data.job;
    detailById.value = { ...detailById.value, [job.id]: job };
    const idx = list.value.findIndex((j) => j.id === job.id);
    if (idx >= 0) {
      list.value = [
        ...list.value.slice(0, idx),
        job,
        ...list.value.slice(idx + 1),
      ];
    }
    return job;
  }

  return {
    list,
    listLoading,
    listError,
    detailById,
    scheduledWorkerIdsByJobId,
    fetchList,
    fetchJob,
    fetchScheduledWorkerIds,
    createJob,
    updateJob,
  };
});
