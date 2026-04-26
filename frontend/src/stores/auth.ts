import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type UserPreference = {
  largeTextMode: boolean;
  preferredView: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  preference?: UserPreference;
};

export type ImpersonationState = {
  adminUser: AuthUser;
  impersonatedUser: AuthUser;
};

const jsonHeaders = { "Content-Type": "application/json" };

export const useAuthStore = defineStore("auth", () => {
  const user = ref<AuthUser | null>(null);
  const impersonation = ref<ImpersonationState | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const isImpersonating = computed(() => impersonation.value !== null);
  const isAdmin = computed(
    () =>
      user.value?.role === "ADMIN" ||
      impersonation.value?.adminUser.role === "ADMIN",
  );

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
        const json = (await r.json()) as {
          data?: { user: AuthUser; impersonation?: ImpersonationState };
        };
        const u = json.data?.user ?? null;
        if (u && !u.preference) {
          u.preference = { largeTextMode: false, preferredView: null };
        }
        user.value = u;
        impersonation.value = json.data?.impersonation ?? null;
      } else {
        user.value = null;
        impersonation.value = null;
      }
    } catch {
      user.value = null;
      impersonation.value = null;
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

  async function register(
    email: string,
    password: string,
    inviteCode: string,
    opts?: {
      firstName?: string;
      lastName?: string;
      name?: string;
      companyName?: string;
    },
  ) {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: jsonHeaders,
      body: JSON.stringify({
        email,
        password,
        inviteCode,
        firstName: opts?.firstName,
        lastName: opts?.lastName,
        name: opts?.name,
        companyName: opts?.companyName,
      }),
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
    impersonation.value = null;
  }

  async function updateProfile(patch: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  }) {
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

  async function stopImpersonation() {
    const r = await fetch("/api/admin/impersonation/stop", {
      method: "POST",
      credentials: "include",
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(
        readApiErrorMessage(data) ?? "Kon meekijken niet stoppen",
      );
    }
    await fetchMe();
  }

  return {
    user,
    impersonation,
    initialized,
    isAuthenticated,
    isAdmin,
    isImpersonating,
    fetchMe,
    login,
    register,
    logout,
    updateProfile,
    stopImpersonation,
  };
});
