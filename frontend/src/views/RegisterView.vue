<script setup lang="ts">
import { FinbarButton, FinbarInput } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";

defineOptions({ name: "RegisterView" });

const email = ref("");
const password = ref("");
const firstName = ref("");
const lastName = ref("");
const error = ref("");
const loading = ref(false);
const router = useRouter();
const auth = useAuthStore();

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.register(email.value, password.value, {
      firstName: firstName.value.trim() || undefined,
      lastName: lastName.value.trim() || undefined,
    });
    await router.push("/");
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Registratie mislukt";
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
      Registreren
    </h1>
    <form
      class="flex flex-col gap-[var(--finbar-space-field-gap)]"
      @submit.prevent="onSubmit"
    >
      <FinbarInput
        id="reg-first-name"
        v-model="firstName"
        label="Voornaam (optioneel)"
        type="text"
        autocomplete="given-name"
      />
      <FinbarInput
        id="reg-last-name"
        v-model="lastName"
        label="Achternaam (optioneel)"
        type="text"
        autocomplete="family-name"
      />
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
        label="Wachtwoord (min. 8 tekens)"
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
        {{ loading ? "…" : "Account aanmaken" }}
      </FinbarButton>
    </form>
    <p class="text-sm text-zinc-600 dark:text-zinc-500">
      Al een account?
      <RouterLink
        to="/login"
        class="finbar-link underline-offset-2 hover:underline"
      >
        Inloggen
      </RouterLink>
    </p>
  </div>
</template>
