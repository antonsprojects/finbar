type ApiErrorJson = { error?: { message?: string } };

function readApiErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== "object") {
    return undefined;
  }
  const e = (json as ApiErrorJson).error;
  if (e && typeof e === "object" && typeof e.message === "string") {
    return e.message;
  }
  return undefined;
}

export type TeamDisplayRule = {
  availability: string | null;
  absence: string[];
};

export async function fetchTeamDisplayRules(
  workerIds: string[],
): Promise<Record<string, TeamDisplayRule>> {
  if (workerIds.length === 0) {
    return {};
  }
  const q = new URLSearchParams({ workerIds: workerIds.join(",") });
  const r = await fetch(`/api/workers/team-display-rules?${q}`, {
    credentials: "include",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      readApiErrorMessage(data) ?? "Kon teamregels niet laden",
    );
  }
  const payload = data as { data?: { rules?: Record<string, TeamDisplayRule> } };
  return payload.data?.rules ?? {};
}
