<script setup lang="ts">
import { FinbarButton, FinbarInput } from "@/components/ui";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

defineOptions({ name: "ResetPasswordView" });

const route = useRoute();

const token = ref("");
const password = ref("");
const passwordConfirm = ref("");
const error = ref("");
const loading = ref(false);
const done = ref(false);

const jsonHeaders = { "Content-Type": "application/json" };

const hasToken = computed(() => token.value.length > 0);

function readApiErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const e = (json as { error?: { message?: string } }).error;
  if (e && typeof e === "object" && typeof e.message === "string") {
    return e.message;
  }
  return undefined;
}

function syncTokenFromRoute() {
  const q = route.query.token;
  token.value = typeof q === "string" ? q.trim() : "";
}

onMounted(() => {
  syncTokenFromRoute();
});

watch(
  () => route.query.token,
  () => {
    syncTokenFromRoute();
  },
);

async function onSubmit() {
  error.value = "";
  if (password.value !== passwordConfirm.value) {
    error.value = "Wachtwoorden komen niet overeen";
    return;
  }
  if (!token.value) {
    error.value = "Ontbrekende link. Vraag een nieuw wachtwoord aan.";
    return;
  }
  loading.value = true;
  try {
    const r = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: jsonHeaders,
      credentials: "include",
      body: JSON.stringify({
        token: token.value,
        password: password.value,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(
        readApiErrorMessage(data) ?? "Wachtwoord kon niet worden gewijzigd",
      );
    }
    done.value = true;
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Wachtwoord kon niet worden gewijzigd";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-sm space-y-[var(--finbar-space-section)]">
    <h1
      class="text-[length:var(--finbar-text-page-title)] font-semibold text-zinc-900 dark:text-white"
    >
      Nieuw wachtwoord
    </h1>
    <p
      v-if="!hasToken"
      class="text-sm text-zinc-600 dark:text-zinc-400"
    >
      Deze link is onvolledig of ongeldig.
      <RouterLink
        to="/forgot-password"
        class="finbar-link font-medium underline-offset-2 hover:underline"
      >
        Vraag een nieuwe link aan
      </RouterLink>
      .
    </p>
    <p
      v-else-if="done"
      class="text-sm text-zinc-600 dark:text-zinc-400"
    >
      Je wachtwoord is bijgewerkt. Je kunt nu inloggen met je nieuwe wachtwoord.
    </p>
    <template v-else>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Kies een nieuw wachtwoord (minimaal 8 tekens).
      </p>
      <form
        class="flex flex-col gap-[var(--finbar-space-field-gap)]"
        @submit.prevent="onSubmit"
      >
        <FinbarInput
          id="reset-password"
          v-model="password"
          label="Nieuw wachtwoord"
          type="password"
          autocomplete="new-password"
          required
          minlength="8"
        />
        <FinbarInput
          id="reset-password-confirm"
          v-model="passwordConfirm"
          label="Bevestig wachtwoord"
          type="password"
          autocomplete="new-password"
          required
          minlength="8"
        />
        <p
          v-if="error"
          class="text-sm text-red-400"
        >
          {{ error }}
        </p>
        <FinbarButton
          type="submit"
          block
          :disabled="loading"
        >
          {{ loading ? "…" : "Opslaan" }}
        </FinbarButton>
      </form>
    </template>
    <p class="text-sm text-zinc-600 dark:text-zinc-500">
      <RouterLink
        to="/login"
        class="finbar-link underline-offset-2 hover:underline"
      >
        Naar inloggen
      </RouterLink>
    </p>
  </div>
</template>
