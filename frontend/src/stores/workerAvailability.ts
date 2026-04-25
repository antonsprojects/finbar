import { defineStore } from "pinia";
import { ref } from "vue";

export type WorkerAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";

export type WorkerAvailabilityRow = {
  id: string;
  userId: string;
  workerId: string;
  date: string;
  status: WorkerAvailabilityStatus;
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

export const useWorkerAvailabilityStore = defineStore(
  "workerAvailability",
  () => {
    const items = ref<WorkerAvailabilityRow[]>([]);
    const loading = ref(false);
    const error = ref("");

    async function fetchRange(params: {
      from: string;
      to: string;
      workerId?: string;
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
        const r = await fetch(`/api/worker-availability?${q}`, {
          credentials: "include",
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(
            readApiErrorMessage(data) ?? "Kon beschikbaarheid niet laden",
          );
        }
        const payload = data as {
          data?: { items?: WorkerAvailabilityRow[] };
        };
        items.value = payload.data?.items ?? [];
      } catch (e) {
        items.value = [];
        error.value =
          e instanceof Error ? e.message : "Kon beschikbaarheid niet laden";
      } finally {
        loading.value = false;
      }
    }

    async function upsertDay(input: {
      workerId: string;
      date: string;
      status: WorkerAvailabilityStatus;
      notes?: string | null;
    }): Promise<WorkerAvailabilityRow> {
      const body: Record<string, unknown> = {
        workerId: input.workerId,
        date: input.date,
        status: input.status,
      };
      if (input.notes !== undefined) {
        body.notes = input.notes;
      }
      const r = await fetch("/api/worker-availability", {
        method: "PUT",
        credentials: "include",
        headers: jsonHeaders,
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(readApiErrorMessage(data) ?? "Kon niet opslaan");
      }
      const payload = data as {
        data?: { availability: WorkerAvailabilityRow };
      };
      const row = payload.data?.availability;
      if (!row) {
        throw new Error("Ongeldig antwoord");
      }
      const idx = items.value.findIndex(
        (x) => x.workerId === row.workerId && x.date === row.date,
      );
      if (idx >= 0) {
        items.value[idx] = row;
      } else {
        items.value.push(row);
      }
      return row;
    }

    async function remove(id: string): Promise<void> {
      const r = await fetch(`/api/worker-availability/${id}`, {
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

    /** Alleen ophalen (wijzigt `items` niet) — o.a. contact-/teamlidpagina. */
    async function fetchRowsForWorkerWindow(params: {
      workerId: string;
      from: string;
      to: string;
    }): Promise<WorkerAvailabilityRow[]> {
      const q = new URLSearchParams({
        from: params.from,
        to: params.to,
        workerId: params.workerId,
        limit: "500",
        offset: "0",
      });
      const r = await fetch(`/api/worker-availability?${q}`, {
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          readApiErrorMessage(data) ?? "Kon beschikbaarheid niet laden",
        );
      }
      const payload = data as {
        data?: { items?: WorkerAvailabilityRow[] };
      };
      return payload.data?.items ?? [];
    }

    return {
      items,
      loading,
      error,
      fetchRange,
      fetchRowsForWorkerWindow,
      upsertDay,
      remove,
    };
  },
);
