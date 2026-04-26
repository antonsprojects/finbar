<script setup lang="ts">
import { FinbarButton, FinbarInput } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "AdminView" });

type InviteStatus = "active" | "expired" | "revoked" | "used";

type Invite = {
  id: string;
  email: string;
  status: InviteStatus;
  expiresAt: string;
  revokedAt: string | null;
  usedAt: string | null;
  usedByUserId: string | null;
  createdAt: string;
};

type AdminUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  createdAt: string;
};

const auth = useAuthStore();
const router = useRouter();
const invites = ref<Invite[]>([]);
const users = ref<AdminUser[]>([]);
const email = ref("");
const loading = ref(false);
const actionError = ref("");
const actionMessage = ref("");

const activeInvites = computed(
  () => invites.value.filter((invite) => invite.status === "active").length,
);

function readApiErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const e = (json as { error?: { message?: string }; message?: string }).error;
  if (e && typeof e === "object" && typeof e.message === "string") {
    return e.message;
  }
  const legacy = (json as { message?: string }).message;
  return typeof legacy === "string" ? legacy : undefined;
}

function displayName(user: AdminUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: InviteStatus): string {
  switch (status) {
    case "active":
      return "Actief";
    case "expired":
      return "Verlopen";
    case "revoked":
      return "Ingetrokken";
    case "used":
      return "Gebruikt";
  }
}

async function api<T>(
  path: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
): Promise<T> {
  const headers = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...init?.headers,
  };
  const r = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });
  const json = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(readApiErrorMessage(json) ?? "Actie mislukt");
  }
  return json as T;
}

async function refresh() {
  const [inviteResponse, userResponse] = await Promise.all([
    api<{ data?: { invites: Invite[] } }>("/api/admin/invites"),
    api<{ data?: { users: AdminUser[] } }>("/api/admin/users"),
  ]);
  invites.value = inviteResponse.data?.invites ?? [];
  users.value = userResponse.data?.users ?? [];
}

async function sendInvite() {
  actionError.value = "";
  actionMessage.value = "";
  loading.value = true;
  try {
    await api("/api/admin/invites", {
      method: "POST",
      body: JSON.stringify({ email: email.value }),
    });
    email.value = "";
    actionMessage.value = "Uitnodiging verstuurd.";
    await refresh();
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : "Uitnodiging mislukt";
  } finally {
    loading.value = false;
  }
}

async function resendInvite(invite: Invite) {
  actionError.value = "";
  actionMessage.value = "";
  try {
    await api(`/api/admin/invites/${invite.id}/resend`, { method: "POST" });
    actionMessage.value = "Uitnodiging opnieuw verstuurd.";
    await refresh();
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : "Opnieuw versturen mislukt";
  }
}

async function revokeInvite(invite: Invite) {
  actionError.value = "";
  actionMessage.value = "";
  try {
    await api(`/api/admin/invites/${invite.id}/revoke`, { method: "POST" });
    actionMessage.value = "Uitnodiging ingetrokken.";
    await refresh();
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : "Intrekken mislukt";
  }
}

async function impersonate(user: AdminUser) {
  actionError.value = "";
  actionMessage.value = "";
  try {
    await api(`/api/admin/users/${user.id}/impersonate`, { method: "POST" });
    await auth.fetchMe();
    await router.push("/");
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : "Meekijken mislukt";
  }
}

onMounted(() => {
  refresh().catch((e: unknown) => {
    actionError.value = e instanceof Error ? e.message : "Beheer laden mislukt";
  });
});
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
    <header class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-sm text-zinc-500 dark:text-zinc-400">Beheer</p>
        <h1 class="text-2xl font-semibold text-zinc-900 dark:text-white">
          Finbar administratie
        </h1>
      </div>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        {{ activeInvites }} actieve uitnodiging(en)
      </p>
    </header>

    <p
      v-if="actionError"
      class="rounded-[var(--finbar-radius)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
    >
      {{ actionError }}
    </p>
    <p
      v-if="actionMessage"
      class="rounded-[var(--finbar-radius)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
    >
      {{ actionMessage }}
    </p>

    <section
      class="rounded-[var(--finbar-radius-lg)] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <h2 class="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        Gebruiker uitnodigen
      </h2>
      <form class="flex flex-col gap-3" @submit.prevent="sendInvite">
        <FinbarInput
          id="admin-invite-email"
          v-model="email"
          class="w-full"
          label="E-mailadres"
          type="email"
          autocomplete="email"
          required
        />
        <FinbarButton
          type="submit"
          class="w-full sm:w-auto sm:self-end"
          :disabled="loading"
        >
          {{ loading ? "Versturen…" : "Uitnodiging versturen" }}
        </FinbarButton>
      </form>
    </section>

    <section
      class="rounded-[var(--finbar-radius-lg)] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <h2 class="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        Uitnodigingen
      </h2>
      <div v-if="invites.length === 0" class="text-sm text-zinc-500">
        Nog geen uitnodigingen.
      </div>
      <ul v-else class="divide-y divide-zinc-200 dark:divide-zinc-800">
        <li
          v-for="invite in invites"
          :key="invite.id"
          class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-medium text-zinc-900 dark:text-white">{{ invite.email }}</p>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ statusLabel(invite.status) }} · verloopt {{ formatDate(invite.expiresAt) }}
            </p>
          </div>
          <div v-if="invite.status === 'active'" class="flex gap-2">
            <FinbarButton variant="secondary" size="sm" @click="resendInvite(invite)">
              Opnieuw versturen
            </FinbarButton>
            <FinbarButton variant="danger" size="sm" @click="revokeInvite(invite)">
              Intrekken
            </FinbarButton>
          </div>
        </li>
      </ul>
    </section>

    <section
      class="rounded-[var(--finbar-radius-lg)] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <h2 class="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        Gebruikers
      </h2>
      <div v-if="users.length === 0" class="text-sm text-zinc-500">
        Nog geen gebruikers.
      </div>
      <ul v-else class="divide-y divide-zinc-200 dark:divide-zinc-800">
        <li
          v-for="user in users"
          :key="user.id"
          class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-medium text-zinc-900 dark:text-white">
              {{ displayName(user) }}
              <span
                v-if="user.role === 'ADMIN'"
                class="ml-2 font-normal text-zinc-500"
              >Beheerder</span>
            </p>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
              {{ user.email }}
              <span v-if="user.companyName"> · {{ user.companyName }}</span>
            </p>
          </div>
          <FinbarButton
            v-if="user.role === 'USER'"
            variant="secondary"
            size="sm"
            @click="impersonate(user)"
          >
            Bekijken als gebruiker
          </FinbarButton>
        </li>
      </ul>
    </section>
  </div>
</template>
