import type { UserPreference } from "@/stores/auth";
import { useAuthStore } from "@/stores/auth";
import { defineStore } from "pinia";

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

export const usePreferencesStore = defineStore("preferences", () => {
  function applyLargeTextDom(enabled: boolean) {
    if (typeof globalThis.document !== "undefined") {
      globalThis.document.documentElement.classList.toggle(
        "finbar-large-text",
        enabled,
      );
    }
  }

  /** Keep `<html>` class in sync with the signed-in user (call after auth changes). */
  function syncFromAuth() {
    const auth = useAuthStore();
    const enabled = auth.user?.preference?.largeTextMode ?? false;
    applyLargeTextDom(enabled);
  }

  async function setLargeTextMode(largeTextMode: boolean): Promise<void> {
    const auth = useAuthStore();
    const r = await fetch("/api/preferences", {
      method: "PATCH",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({ largeTextMode }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Kon voorkeuren niet opslaan");
    }
    const payload = data as { data?: { preference: UserPreference } };
    const pref = payload.data?.preference;
    if (pref && auth.user) {
      auth.user = {
        ...auth.user,
        preference: {
          largeTextMode: pref.largeTextMode,
          preferredView: pref.preferredView,
        },
      };
    }
    applyLargeTextDom(pref?.largeTextMode ?? largeTextMode);
  }

  return {
    syncFromAuth,
    setLargeTextMode,
  };
});
