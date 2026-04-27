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

export type BudgetTodoDto = {
  id: string;
  phaseId: string;
  title: string;
  hours: string;
  hourlyRate: string;
  materialsDescription: string | null;
  materialCost: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BudgetPhaseDto = {
  id: string;
  jobId: string;
  name: string;
  sortOrder: number;
  todos: BudgetTodoDto[];
  createdAt: string;
  updatedAt: string;
};

export async function fetchBegroting(
  projectId: string,
): Promise<BudgetPhaseDto[]> {
  const r = await fetch(`/api/jobs/${encodeURIComponent(projectId)}/begroting`, {
    credentials: "include",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      readApiErrorMessage(data) ?? "Kon begroting niet laden",
    );
  }
  const payload = data as { data?: { phases?: BudgetPhaseDto[] } };
  return payload.data?.phases ?? [];
}

export async function createPhase(
  projectId: string,
  name: string,
): Promise<BudgetPhaseDto> {
  const r = await fetch(
    `/api/jobs/${encodeURIComponent(projectId)}/begroting/phases`,
    {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({ name }),
    },
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(readApiErrorMessage(data) ?? "Kon fase niet aanmaken");
  }
  const payload = data as { data?: { phase: BudgetPhaseDto } };
  if (!payload.data?.phase) {
    throw new Error("Ongeldig antwoord");
  }
  return payload.data.phase;
}

export async function updatePhase(
  projectId: string,
  phaseId: string,
  input: { name: string },
): Promise<BudgetPhaseDto> {
  const r = await fetch(
    `/api/jobs/${encodeURIComponent(projectId)}/begroting/phases/${encodeURIComponent(phaseId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({ name: input.name }),
    },
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      readApiErrorMessage(data) ?? "Kon fase niet bijwerken",
    );
  }
  const payload = data as { data?: { phase: BudgetPhaseDto } };
  if (!payload.data?.phase) {
    throw new Error("Ongeldig antwoord");
  }
  return payload.data.phase;
}

export async function deletePhase(
  projectId: string,
  phaseId: string,
): Promise<void> {
  const r = await fetch(
    `/api/jobs/${encodeURIComponent(projectId)}/begroting/phases/${encodeURIComponent(phaseId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (r.status === 204) return;
  const data = await r.json().catch(() => ({}));
  throw new Error(readApiErrorMessage(data) ?? "Kon fase niet verwijderen");
}

export async function createBudgetTodo(
  projectId: string,
  phaseId: string,
  input: {
    title: string;
    hours: number;
    hourlyRate: number;
    materialsDescription: string | null;
    materialCost: number;
  },
): Promise<BudgetTodoDto> {
  const r = await fetch(
    `/api/jobs/${encodeURIComponent(projectId)}/begroting/phases/${encodeURIComponent(phaseId)}/todos`,
    {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({
        title: input.title,
        hours: input.hours,
        hourlyRate: input.hourlyRate,
        materialsDescription: input.materialsDescription,
        materialCost: input.materialCost,
      }),
    },
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(readApiErrorMessage(data) ?? "Kon taak niet aanmaken");
  }
  const payload = data as { data?: { todo: BudgetTodoDto } };
  if (!payload.data?.todo) {
    throw new Error("Ongeldig antwoord");
  }
  return payload.data.todo;
}

export async function updateBudgetTodo(
  projectId: string,
  todoId: string,
  input: {
    title: string;
    hours: number;
    hourlyRate: number;
    materialsDescription: string | null;
    materialCost: number;
  },
): Promise<BudgetTodoDto> {
  const r = await fetch(
    `/api/jobs/${encodeURIComponent(projectId)}/begroting/todos/${encodeURIComponent(todoId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({
        title: input.title,
        hours: input.hours,
        hourlyRate: input.hourlyRate,
        materialsDescription: input.materialsDescription,
        materialCost: input.materialCost,
      }),
    },
  );
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(readApiErrorMessage(data) ?? "Kon taak niet bijwerken");
  }
  const payload = data as { data?: { todo: BudgetTodoDto } };
  if (!payload.data?.todo) {
    throw new Error("Ongeldig antwoord");
  }
  return payload.data.todo;
}

export async function deleteBudgetTodo(
  projectId: string,
  todoId: string,
): Promise<void> {
  const r = await fetch(
    `/api/jobs/${encodeURIComponent(projectId)}/begroting/todos/${encodeURIComponent(todoId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (r.status === 204) return;
  const data = await r.json().catch(() => ({}));
  throw new Error(readApiErrorMessage(data) ?? "Kon taak niet verwijderen");
}

export function parseNum(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const eur = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

export function formatEur(n: number): string {
  return eur.format(n);
}
