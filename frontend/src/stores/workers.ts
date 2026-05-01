import { defineStore } from "pinia";
import { ref } from "vue";

export type Worker = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  /** Weergavenaam (voornaam + achternaam), afgeleid op de server. */
  name: string;
  trades: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiErrorJson = { error?: { message?: string } };

/** Runtime fallback als oude API nog `trade` teruggeeft (tijdens rollout). */
function coerceWorker(row: Worker): Worker {
  const anyRow = row as Worker & { trade?: string | null };
  let trades = Array.isArray(row.trades) ? [...row.trades] : [];
  if (trades.length === 0 && typeof anyRow.trade === "string" && anyRow.trade.trim()) {
    trades = anyRow.trade
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return { ...row, trades };
}

function readApiErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const e = (json as ApiErrorJson).error;
  if (e && typeof e === "object" && typeof e.message === "string") {
    return e.message;
  }
  return undefined;
}

const jsonHeaders = { "Content-Type": "application/json" };

export const useWorkersStore = defineStore("workers", () => {
  const list = ref<Worker[]>([]);
  const listLoading = ref(false);
  const listError = ref("");

  async function fetchList() {
    listLoading.value = true;
    listError.value = "";
    try {
      const q = new URLSearchParams({ limit: "100", offset: "0" });
      const r = await fetch(`/api/workers?${q}`, { credentials: "include" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(readApiErrorMessage(data) ?? "Kon teamleden niet laden");
      }
      const payload = data as {
        data?: { items?: Worker[] };
      };
      const items = payload.data?.items ?? [];
      list.value = items.map(coerceWorker);
    } catch (e) {
      list.value = [];
      listError.value =
        e instanceof Error ? e.message : "Kon teamleden niet laden";
    } finally {
      listLoading.value = false;
    }
  }

  async function fetchWorker(id: string): Promise<Worker | null> {
    const r = await fetch(`/api/workers/${id}`, { credentials: "include" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Teamlid niet gevonden");
    }
    const payload = data as { data?: { worker: Worker } };
    const w = payload.data?.worker ?? null;
    return w ? coerceWorker(w) : null;
  }

  async function createWorker(input: {
    firstName: string;
    lastName?: string;
    trades?: string[];
    notes?: string | null;
  }): Promise<Worker> {
    const r = await fetch("/api/workers", {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify(input),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Kon teamlid niet aanmaken");
    }
    const payload = data as { data?: { worker: Worker } };
    if (!payload.data?.worker) {
      throw new Error("Ongeldig antwoord");
    }
    return coerceWorker(payload.data.worker);
  }

  async function updateWorker(
    id: string,
    patch: Partial<{
      firstName: string;
      lastName: string;
      trades: string[];
      notes: string | null;
    }>,
  ): Promise<Worker> {
    const r = await fetch(`/api/workers/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify(patch),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Kon teamlid niet bijwerken");
    }
    const payload = data as { data?: { worker: Worker } };
    if (!payload.data?.worker) {
      throw new Error("Ongeldig antwoord");
    }
    return coerceWorker(payload.data.worker);
  }

  /**
   * Vakgebied-strings uit het netwerk (alle teamleden van de gebruiker).
   * Bij bewerken: `excludeWorkerId` weglaten om alleen **andere** mensen te gebruiken.
   */
  function networkTradeSuggestions(excludeWorkerId?: string): string[] {
    const rows = excludeWorkerId
      ? list.value.filter((w) => w.id !== excludeWorkerId)
      : list.value;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const w of rows) {
      for (const raw of w.trades ?? []) {
        const t = raw.trim();
        if (!t) continue;
        const k = t.toLocaleLowerCase("nl-NL");
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(t);
      }
    }
    return out.sort((a, b) =>
      a.localeCompare(b, "nl", { sensitivity: "base" }),
    );
  }

  return {
    list,
    listLoading,
    listError,
    fetchList,
    fetchWorker,
    createWorker,
    updateWorker,
    networkTradeSuggestions,
  };
});
