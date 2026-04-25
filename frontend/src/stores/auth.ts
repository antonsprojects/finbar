import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type UserPreference = {
  largeTextMode: boolean;
  preferredView: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  preference?: UserPreference;
};

const jsonHeaders = { "Content-Type": "application/json" };

export const useAuthStore = defineStore("auth", () => {
  const user = ref<AuthUser | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => user.value !== null);

  function readApiErrorMessage(json: unknown): string | undefined {
    if (!json || typeof json !== "object") return undefined;
    const e = (json as { error?: { message?: string }; message?: string })
      .error;
    if (e && typeof e === "object" && typeof e.message === "string") {
      return e.message;
    }
    const legacy = (json as { message?: string }).message;
    return typeof legacy === "string" ? legacy : undefined;
  }

  async function fetchMe() {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      if (r.ok) {
        const json = (await r.json()) as { data?: { user: AuthUser } };
        const u = json.data?.user ?? null;
        if (u && !u.preference) {
          u.preference = { largeTextMode: false, preferredView: null };
        }
        user.value = u;
      } else {
        user.value = null;
      }
    } catch {
      user.value = null;
    } finally {
      initialized.value = true;
    }
  }

  async function login(email: string, password: string) {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Inloggen mislukt");
    }
    await fetchMe();
  }

  async function register(email: string, password: string, name?: string) {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({ email, password, name }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Registratie mislukt");
    }
    await fetchMe();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    user.value = null;
  }

  async function updateProfile(patch: { name: string }) {
    const r = await fetch("/api/auth/me", {
      method: "PATCH",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify(patch),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(readApiErrorMessage(data) ?? "Kon profiel niet opslaan");
    }
    const payload = data as { data?: { user: AuthUser } };
    const u = payload.data?.user;
    if (u) {
      if (!u.preference && user.value?.preference) {
        u.preference = user.value.preference;
      }
      user.value = u;
    } else {
      await fetchMe();
    }
  }

  return {
    user,
    initialized,
    isAuthenticated,
    fetchMe,
    login,
    register,
    logout,
    updateProfile,
  };
});
