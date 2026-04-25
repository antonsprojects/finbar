<script setup lang="ts">
import { FinbarButton, FinbarInput } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

defineOptions({ name: "LoginView" });

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    const redirect =
      typeof route.query.redirect === "string" && route.query.redirect.startsWith("/")
        ? route.query.redirect
        : "/";
    await router.push(redirect);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Inloggen mislukt";
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
      Inloggen
    </h1>
    <form
      class="flex flex-col gap-[var(--finbar-space-field-gap)]"
      @submit.prevent="onSubmit"
    >
      <FinbarInput
        id="email"
        v-model="email"
        label="E-mail"
        type="email"
        autocomplete="email"
        required
      />
      <FinbarInput
        id="password"
        v-model="password"
        label="Wachtwoord"
        type="password"
        autocomplete="current-password"
        required
      />
      <p class="text-right text-sm">
        <RouterLink
          to="/forgot-password"
          class="finbar-link underline-offset-2 hover:underline"
        >
          Wachtwoord vergeten?
        </RouterLink>
      </p>
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
        {{ loading ? "…" : "Inloggen" }}
      </FinbarButton>
    </form>
    <p class="text-sm text-zinc-600 dark:text-zinc-500">
      Nog geen account?
      <RouterLink
        to="/register"
        class="finbar-link underline-offset-2 hover:underline"
      >
        Registreren
      </RouterLink>
    </p>
  </div>
</template>
