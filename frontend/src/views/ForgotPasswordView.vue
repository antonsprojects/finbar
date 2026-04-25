<script setup lang="ts">
import { FinbarButton, FinbarInput } from "@/components/ui";
import { ref } from "vue";
import { RouterLink } from "vue-router";

defineOptions({ name: "ForgotPasswordView" });

/** Lokaal: geen echte mail zonder Resend — zie API-terminal. */
const isDev = import.meta.env.DEV;

const email = ref("");
const error = ref("");
const loading = ref(false);
const done = ref(false);

const jsonHeaders = { "Content-Type": "application/json" };

function readApiErrorMessage(json: unknown): string | undefined {
  if (!json || typeof json !== "object") return undefined;
  const e = (json as { error?: { message?: string } }).error;
  if (e && typeof e === "object" && typeof e.message === "string") {
    return e.message;
  }
  return undefined;
}

/** Bij geen draaiende API geeft `fetch` o.a. TypeError "Failed to fetch". */
function formatClientError(e: unknown): string {
  if (e instanceof TypeError) {
    const m = (e.message || "").toLowerCase();
    if (
      m.includes("failed to fetch") ||
      m.includes("load failed") ||
      m.includes("networkerror")
    ) {
      return import.meta.env.DEV
        ? "Geen verbinding met de API (poort 3001). Start in een aparte terminal: npm run dev:api"
        : "Kan geen verbinding met de server maken. Probeer het later opnieuw.";
    }
  }
  if (e instanceof Error) {
    return e.message || "Kon verzoek niet verwerken";
  }
  return "Kon verzoek niet verwerken";
}

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    const r = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: jsonHeaders,
      credentials: "include",
      body: JSON.stringify({ email: email.value.trim() }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      throw new Error(
        readApiErrorMessage(data) ?? "Kon verzoek niet verwerken",
      );
    }
    done.value = true;
  } catch (e) {
    error.value = formatClientError(e);
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
      Wachtwoord vergeten
    </h1>
    <p
      v-if="!done"
      class="text-sm text-zinc-600 dark:text-zinc-400"
    >
      Vul je e-mailadres in. Als het bij ons bekend is, sturen we instructies om
      je wachtwoord opnieuw in te stellen.
    </p>
    <template v-else>
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Als dit e-mailadres bij ons bekend is, ontvang je een bericht met
        instructies. Controleer ook je spam-map.
      </p>
      <p
        v-if="isDev"
        class="rounded-md border border-amber-800/60 bg-amber-950/25 px-3 py-2 text-sm text-amber-100/95 dark:border-amber-700/50"
      >
        <span class="font-medium text-amber-200">Lokaal:</span>
        zonder <code class="rounded bg-black/20 px-1 font-mono text-xs">RESEND_API_KEY</code> in
        <code class="rounded bg-black/20 px-1 font-mono text-xs">backend/.env</code>         wordt er geen e-mail verstuurd. Open de terminal waar
        <code class="rounded bg-black/20 px-1 font-mono text-xs">npm run dev:api</code> draait en
        zoek de logregel met <code class="rounded bg-black/20 px-1 font-mono text-xs">resetUrl</code>
        — daar staat je resetlink.
      </p>
    </template>
    <form
      v-if="!done"
      class="flex flex-col gap-[var(--finbar-space-field-gap)]"
      @submit.prevent="onSubmit"
    >
      <FinbarInput
        id="forgot-email"
        v-model="email"
        label="E-mail"
        type="email"
        autocomplete="email"
        required
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
        {{ loading ? "…" : "Versturen" }}
      </FinbarButton>
    </form>
    <p class="text-sm text-zinc-600 dark:text-zinc-500">
      <RouterLink
        to="/login"
        class="finbar-link underline-offset-2 hover:underline"
      >
        Terug naar inloggen
      </RouterLink>
    </p>
  </div>
</template>
