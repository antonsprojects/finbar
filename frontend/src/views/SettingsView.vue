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

const profileFirstName = ref("");
const profileLastName = ref("");
const profileCompanyName = ref("");
const profileSaving = ref(false);
const profileError = ref("");
const profileSaved = ref(false);

watch(
  () => auth.user,
  (u) => {
    profileFirstName.value = u?.firstName ?? "";
    profileLastName.value = u?.lastName ?? "";
    profileCompanyName.value = u?.companyName ?? "";
  },
  { immediate: true },
);

watch([profileFirstName, profileLastName, profileCompanyName], () => {
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
    await auth.updateProfile({
      firstName: profileFirstName.value.trim() || null,
      lastName: profileLastName.value.trim() || null,
      companyName: profileCompanyName.value.trim() || null,
    });
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
          id="settings-first-name"
          v-model="profileFirstName"
          label="Voornaam"
          maxlength="100"
          autocomplete="given-name"
        />
        <FinbarInput
          id="settings-last-name"
          v-model="profileLastName"
          label="Achternaam"
          maxlength="100"
          autocomplete="family-name"
        />
        <FinbarInput
          id="settings-company"
          v-model="profileCompanyName"
          label="Bedrijfsnaam"
          maxlength="200"
          autocomplete="organization"
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
      <p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Donkere modus is nog in ontwikkeling.
      </p>
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
