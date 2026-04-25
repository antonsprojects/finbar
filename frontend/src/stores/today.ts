import type { JobStatus } from "@/stores/jobs";
import type { TaskStatus } from "@/stores/tasks";
import { defineStore } from "pinia";
import { ref } from "vue";

export type TodayCrewRow = {
  assignmentId: string;
  workerId: string;
  workerName: string;
  jobId: string;
  jobName: string;
  notes: string | null;
};

export type TodayAvailabilityRow = {
  workerId: string;
  workerName: string;
  status: "AVAILABLE" | "UNAVAILABLE";
  notes: string | null;
};

export type TodayActiveJob = {
  id: string;
  name: string;
  status: JobStatus;
};

export type TodayTask = {
  id: string;
  userId: string;
  jobId: string;
  /** Aanwezig wanneer de taak uit de begroting komt; ontbreekt bij oudere data. */
  budgetLineId?: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  scheduledDate: string | null;
  assignedWorkerIds: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  job: { id: string; name: string };
  assignedWorkers: { id: string; name: string }[];
};

export type TodayScheduleWarning = {
  workerId: string;
  workerName: string;
  jobName: string;
  availabilityNotes: string | null;
};

export type TodayPayload = {
  date: string;
  crew: TodayCrewRow[];
  availabilityToday: TodayAvailabilityRow[];
  activeJobs: TodayActiveJob[];
  tasksDueToday: TodayTask[];
  tasksOverdue: TodayTask[];
  tasksUnassigned: TodayTask[];
  scheduleWarnings: TodayScheduleWarning[];
};

/** Eén kalenderdag uit het /api/today-antwoord (voor dag-voor-dag UI). */
export type TodayDayBlock = {
  date: string;
  payload: TodayPayload;
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

export const useTodayStore = defineStore("today", () => {
  const snapshot = ref<TodayPayload | null>(null);
  /** Opeenvolgende dagen (bv. vandaag + 6), parallel geladen. */
  const rangeDays = ref<TodayDayBlock[]>([]);
  const loading = ref(false);
  const error = ref("");

  async function fetchToday(dateYmd?: string, jobId?: string) {
    loading.value = true;
    error.value = "";
    try {
      const q = new URLSearchParams();
      if (dateYmd !== undefined) {
        q.set("date", dateYmd);
      }
      if (jobId !== undefined) {
        q.set("jobId", jobId);
      }
      const qs = q.toString();
      const r = await fetch(
        `/api/today${qs ? `?${qs}` : ""}`,
        { credentials: "include" },
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(readApiErrorMessage(data) ?? "Kon vandaag niet laden");
      }
      const payload = data as { data?: TodayPayload };
      snapshot.value = payload.data ?? null;
    } catch (e) {
      snapshot.value = null;
      error.value = e instanceof Error ? e.message : "Kon vandaag niet laden";
    } finally {
      loading.value = false;
    }
  }

  /** Haal meerdere opeenvolgende dagen op (start = eerste dag, lokale YYYY-MM-DD). */
  async function fetchTodayRange(
    startYmd: string,
    dayCount: number,
    jobId?: string,
  ) {
    loading.value = true;
    error.value = "";
    rangeDays.value = [];
    const [y0, m0, d0] = startYmd.split("-").map(Number);
    const dates: string[] = [];
    for (let i = 0; i < dayCount; i++) {
      const dt = new Date(y0, m0 - 1, d0);
      dt.setDate(dt.getDate() + i);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const d = String(dt.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    }
    try {
      const blocks = await Promise.all(
        dates.map(async (date) => {
          const q = new URLSearchParams({ date });
          if (jobId !== undefined) {
            q.set("jobId", jobId);
          }
          const r = await fetch(`/api/today?${q}`, { credentials: "include" });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) {
            throw new Error(
              readApiErrorMessage(data) ?? "Kon dagoverzicht niet laden",
            );
          }
          const payload = (data as { data?: TodayPayload }).data;
          if (!payload) {
            throw new Error("Ongeldig antwoord");
          }
          return { date, payload } satisfies TodayDayBlock;
        }),
      );
      rangeDays.value = blocks;
      snapshot.value = blocks[0]?.payload ?? null;
    } catch (e) {
      rangeDays.value = [];
      snapshot.value = null;
      error.value =
        e instanceof Error ? e.message : "Kon dagoverzicht niet laden";
    } finally {
      loading.value = false;
    }
  }

  return {
    snapshot,
    rangeDays,
    loading,
    error,
    fetchToday,
    fetchTodayRange,
  };
});
