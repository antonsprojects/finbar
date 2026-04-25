import { defineStore } from "pinia";

export type WorkerAvailabilityPeriodKind = "PART_TIME" | "FIXED_SHIFT";

export type WorkerAvailabilityPeriod = {
  id: string;
  userId: string;
  workerId: string;
  dateFrom: string;
  /** Vaste dienst zonder einddatum: `null`. */
  dateTo: string | null;
  kind: WorkerAvailabilityPeriodKind;
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

export const useWorkerAvailabilityPeriodsStore = defineStore(
  "workerAvailabilityPeriods",
  () => {
    async function fetchForWorker(workerId: string): Promise<
      WorkerAvailabilityPeriod[]
    > {
      const q = new URLSearchParams({
        workerId,
        limit: "100",
        offset: "0",
      });
      const r = await fetch(`/api/worker-availability-periods?${q}`, {
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          readApiErrorMessage(data) ?? "Kon periodes niet laden",
        );
      }
      const payload = data as {
        data?: { items?: WorkerAvailabilityPeriod[] };
      };
      return payload.data?.items ?? [];
    }

    async function createPeriod(input: {
      workerId: string;
      dateFrom: string;
      dateTo: string | null;
      kind: WorkerAvailabilityPeriodKind;
      notes?: string | null;
    }): Promise<WorkerAvailabilityPeriod> {
      const r = await fetch("/api/worker-availability-periods", {
        method: "POST",
        credentials: "include",
        headers: jsonHeaders,
        body: JSON.stringify({
          ...input,
          notes: input.notes ?? null,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(readApiErrorMessage(data) ?? "Kon periode niet opslaan");
      }
      const payload = data as { data?: { period: WorkerAvailabilityPeriod } };
      if (!payload.data?.period) {
        throw new Error("Ongeldig antwoord");
      }
      return payload.data.period;
    }

    async function removePeriod(id: string): Promise<void> {
      const r = await fetch(`/api/worker-availability-periods/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.status === 204) return;
      const data = await r.json().catch(() => ({}));
      throw new Error(readApiErrorMessage(data) ?? "Kon periode niet verwijderen");
    }

    return {
      fetchForWorker,
      createPeriod,
      removePeriod,
    };
  },
);
