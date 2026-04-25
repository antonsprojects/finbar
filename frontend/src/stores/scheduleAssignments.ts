import { defineStore } from "pinia";
import { ref } from "vue";

export type ScheduleAssignmentRow = {
  id: string;
  userId: string;
  workerId: string;
  jobId: string;
  date: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  job: { id: string; name: string };
  worker: { id: string; name: string };
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

export const useScheduleAssignmentsStore = defineStore(
  "scheduleAssignments",
  () => {
    const items = ref<ScheduleAssignmentRow[]>([]);
    const loading = ref(false);
    const error = ref("");

    async function fetchRange(params: {
      from: string;
      to: string;
      workerId?: string;
      jobId?: string;
    }) {
      loading.value = true;
      error.value = "";
      try {
        const q = new URLSearchParams({
          from: params.from,
          to: params.to,
          limit: "500",
          offset: "0",
        });
        if (params.workerId !== undefined) {
          q.set("workerId", params.workerId);
        }
        if (params.jobId !== undefined) {
          q.set("jobId", params.jobId);
        }
        const r = await fetch(`/api/schedule-assignments?${q}`, {
          credentials: "include",
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(
            readApiErrorMessage(data) ?? "Kon planning niet laden",
          );
        }
        const payload = data as {
          data?: { items?: ScheduleAssignmentRow[] };
        };
        items.value = payload.data?.items ?? [];
      } catch (e) {
        items.value = [];
        error.value =
          e instanceof Error ? e.message : "Kon planning niet laden";
      } finally {
        loading.value = false;
      }
    }

    function assignmentPostBody(input: {
      workerId: string;
      jobId: string;
      date: string;
      notes?: string | null;
    }): Record<string, unknown> {
      const body: Record<string, unknown> = {
        workerId: input.workerId,
        jobId: input.jobId,
        date: input.date,
      };
      if (input.notes !== undefined) {
        body.notes = input.notes;
      }
      return body;
    }

    /**
     * Contact op het projectteam zetten (zonder dagmaand).
     * Inplanning gebeurt apart via de planning of weekweergave.
     */
    async function createInitialOnProject(input: {
      workerId: string;
      jobId: string;
    }): Promise<void> {
      const r = await fetch("/api/schedule-assignments/initial-on-project", {
        method: "POST",
        credentials: "include",
        headers: jsonHeaders,
        body: JSON.stringify({
          workerId: input.workerId,
          jobId: input.jobId,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(readApiErrorMessage(data) ?? "Kon niet aanmaken");
      }
    }

    async function createAssignment(input: {
      workerId: string;
      jobId: string;
      date: string;
      notes?: string | null;
    }): Promise<ScheduleAssignmentRow> {
      const r = await fetch("/api/schedule-assignments", {
        method: "POST",
        credentials: "include",
        headers: jsonHeaders,
        body: JSON.stringify(assignmentPostBody(input)),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(readApiErrorMessage(data) ?? "Kon niet aanmaken");
      }
      const payload = data as {
        data?: { assignment: ScheduleAssignmentRow };
      };
      const row = payload.data?.assignment;
      if (!row) {
        throw new Error("Ongeldig antwoord");
      }
      items.value.push(row);
      return row;
    }

    async function remove(id: string): Promise<void> {
      const r = await fetch(`/api/schedule-assignments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.status === 204) {
        items.value = items.value.filter((x) => x.id !== id);
        return;
      }
      const data = await r.json().catch(() => ({}));
      throw new Error(readApiErrorMessage(data) ?? "Kon niet verwijderen");
    }

    async function updateNotes(
      id: string,
      notes: string | null,
    ): Promise<ScheduleAssignmentRow> {
      const r = await fetch(`/api/schedule-assignments/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: jsonHeaders,
        body: JSON.stringify({ notes }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(readApiErrorMessage(data) ?? "Kon niet bijwerken");
      }
      const payload = data as {
        data?: { assignment: ScheduleAssignmentRow };
      };
      const row = payload.data?.assignment;
      if (!row) {
        throw new Error("Ongeldig antwoord");
      }
      const idx = items.value.findIndex((x) => x.id === id);
      if (idx >= 0) {
        items.value[idx] = row;
      }
      return row;
    }

    return {
      items,
      loading,
      error,
      fetchRange,
      createInitialOnProject,
      createAssignment,
      remove,
      updateNotes,
    };
  },
);
