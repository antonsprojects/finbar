import { defineStore } from "pinia";
import { ref } from "vue";

export type TaskStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "Bezig",
  DONE: "Klaar",
  CANCELLED: "Geannuleerd",
};

export type Task = {
  id: string;
  userId: string;
  jobId: string;
  /** Koppeling met begrotingsregel (Vandaag-flow); ontbreekt bij oudere data. */
  budgetLineId?: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  scheduledDate: string | null;
  /** Alle toegewezen teamleden (volgorde: naam, server-side). */
  assignedWorkerIds: string[];
  assignedWorkers?: { id: string; name: string }[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  job?: { id: string; name: string };
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

export const useTasksStore = defineStore("tasks", () => {
  const list = ref<Task[]>([]);
  const listLoading = ref(false);
  const listError = ref("");

  async function fetchList(filters?: {
    jobId?: string;
    status?: TaskStatus;
    scheduledDate?: string;
  }) {
    listLoading.value = true;
    listError.value = "";
    try {
      const q = new URLSearchParams({ limit: "100", offset: "0" });
      if (filters?.jobId) q.set("jobId", filters.jobId);
      if (filters?.status) q.set("status", filters.status);
      if (filters?.scheduledDate) q.set("scheduledDate", filters.scheduledDate);
      const r = await fetch(`/api/tasks?${q}`, { credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(readApiErrorMessage(data) ?? "Kon taken niet laden");
      }
      const payload = data as {
        data?: { items?: Task[] };
      };
      list.value = payload.data?.items ?? [];
    } catch (e) {
      list.value = [];
      listError.value =
        e instanceof Error ? e.message : "Kon taken niet laden";
    } finally {
      listLoading.value = false;
    }
  }

  async function fetchTask(id: string): Promise<Task | null> {
    const r = await fetch(`/api/tasks/${id}`, { credentials: "include" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Taak niet gevonden");
    }
    const payload = data as { data?: { task: Task } };
    return payload.data?.task ?? null;
  }

  async function createTask(input: {
    jobId: string;
    title: string;
    description?: string | null;
    status?: TaskStatus;
    scheduledDate?: string | null;
    assignedWorkerIds?: string[];
    budgetLineId?: string;
  }): Promise<Task> {
    const r = await fetch("/api/tasks", {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Kon taak niet aanmaken");
    }
    const payload = data as { data?: { task: Task } };
    if (!payload.data?.task) {
      throw new Error("Ongeldig antwoord");
    }
    return payload.data.task;
  }

  async function updateTask(
    id: string,
    patch: Partial<{
      title: string;
      description: string | null;
      status: TaskStatus;
      scheduledDate: string | null;
      assignedWorkerIds: string[];
    }>,
  ): Promise<Task> {
    const r = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify(patch),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Kon taak niet bijwerken");
    }
    const payload = data as { data?: { task: Task } };
    if (!payload.data?.task) {
      throw new Error("Ongeldig antwoord");
    }
    return payload.data.task;
  }

  async function deleteTask(id: string): Promise<void> {
    const r = await fetch(`/api/tasks/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (r.status === 204) {
      list.value = list.value.filter((t) => t.id !== id);
      return;
    }
    const data = await r.json().catch(() => ({}));
    throw new Error(readApiErrorMessage(data) ?? "Kon taak niet verwijderen");
  }

  return {
    list,
    listLoading,
    listError,
    fetchList,
    fetchTask,
    createTask,
    updateTask,
    deleteTask,
  };
});
