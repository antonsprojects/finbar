<script setup lang="ts">
import {
  FinbarButton,
  FinbarCard,
  FinbarInput,
  FinbarPageHeader,
  FinbarThemeToggle,
  FinbarToggle,
} from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { computed, ref, watch } from "vue";

defineOptions({ name: "SettingsView" });

const auth = useAuthStore();
const preferences = usePreferencesStore();

const profileName = ref("");
const profileSaving = ref(false);
const profileError = ref("");
const profileSaved = ref(false);

watch(
  () => auth.user,
  (u) => {
    profileName.value = u?.name ?? "";
  },
  { immediate: true },
);

watch(profileName, () => {
  profileSaved.value = false;
});

const saving = ref(false);
const error = ref("");

const largeTextEnabled = computed(
  () => auth.user?.preference?.largeTextMode ?? false,
);

async function saveProfile() {
  profileSaving.value = true;
  profileError.value = "";
  profileSaved.value = false;
  try {
    await auth.updateProfile({ name: profileName.value });
    profileSaved.value = true;
  } catch (err) {
    profileError.value =
      err instanceof Error ? err.message : "Kon profiel niet opslaan";
  } finally {
    profileSaving.value = false;
  }
}

async function onLargeTextToggle(next: boolean) {
  saving.value = true;
  error.value = "";
  try {
    await preferences.setLargeTextMode(next);
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : "Kon voorkeuren niet opslaan";
    await auth.fetchMe();
    preferences.syncFromAuth();
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <FinbarPageHeader title="Instellingen">
      <template #description>
        Weergave en account.
      </template>
    </FinbarPageHeader>

    <FinbarCard
      v-if="auth.user"
      as="section"
    >
      <h2 class="text-base font-medium text-zinc-900 dark:text-white">
        Profiel
      </h2>
      <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Je weergavenaam in het menu. E-mail kun je niet zelf wijzigen.
      </p>
      <div class="mt-4 space-y-3">
        <div>
          <p class="finbar-field-label">
            E-mail
          </p>
          <p class="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
            {{ auth.user.email }}
          </p>
        </div>
        <FinbarInput
          id="settings-display-name"
          v-model="profileName"
          label="Weergavenaam"
          hint="Optioneel. Leeg laten om je e-mail in het menu te tonen."
          maxlength="200"
          autocomplete="nickname"
        />
        <p
          v-if="profileError"
          class="text-sm text-red-400"
        >
          {{ profileError }}
        </p>
        <p
          v-else-if="profileSaved"
          class="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Opgeslagen.
        </p>
        <FinbarButton
          type="button"
          variant="secondary"
          :disabled="profileSaving"
          @click="saveProfile"
        >
          {{ profileSaving ? "Opslaan…" : "Profiel opslaan" }}
        </FinbarButton>
      </div>
    </FinbarCard>

    <FinbarCard
      v-if="auth.user"
      as="section"
      class="mt-6"
    >
      <h2 class="text-base font-medium text-zinc-900 dark:text-white">
        Weergave
      </h2>
      <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Licht, donker of volgens je systeem. Opgeslagen in deze browser.
      </p>
      <div class="mt-4">
        <FinbarThemeToggle />
      </div>
    </FinbarCard>

    <FinbarCard
      v-if="auth.user"
      as="section"
      class="mt-6"
    >
      <h2 class="text-base font-medium text-zinc-900 dark:text-white">
        Leesbaarheid
      </h2>
      <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Grotere tekst, meer ruimte en grotere tikdoelen in de hele app. Opgeslagen op je account, dus overal hetzelfde.
      </p>
      <div class="mt-4">
        <FinbarToggle
          input-id="large-text"
          :model-value="largeTextEnabled"
          :disabled="saving"
          label="Grote tekst"
          description="Verhoogt basislettergrootte, regelafstand, opvulling en knophoogtes — niet alleen de tekstgrootte."
          @update:model-value="onLargeTextToggle"
        />
      </div>
      <p
        v-if="error"
        class="mt-2 text-sm text-red-400"
      >
        {{ error }}
      </p>
    </FinbarCard>

    <p
      v-else
      class="text-sm text-zinc-600 dark:text-zinc-400"
    >
      Log in om voorkeuren te wijzigen.
    </p>
  </div>
</template>
