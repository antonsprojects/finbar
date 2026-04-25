<script setup lang="ts">
import {
  FinbarButton,
  FinbarCard,
  FinbarInput,
  FinbarPageHeader,
  FinbarSelect,
  FinbarTextarea,
} from "@/components/ui";
import {
  JOB_STATUS_LABELS,
  useJobsStore,
  type JobStatus,
} from "@/stores/jobs";
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";

defineOptions({ name: "ProjectSettingsView" });

const route = useRoute();
const jobs = useJobsStore();

const projectId = computed(() => route.params.projectId as string);

const job = computed(() => jobs.detailById[projectId.value] ?? null);

const nameDraft = ref("");
const addressDraft = ref("");
const statusDraft = ref<JobStatus>("PLANNING");
const saving = ref(false);
const error = ref("");
const saved = ref(false);

watch(
  projectId,
  async (id) => {
    error.value = "";
    saved.value = false;
    try {
      await jobs.fetchJob(id);
    } catch {
      /* ProjectLayout redirect bij onbekend project */
    }
  },
  { immediate: true },
);

watch(
  () => job.value,
  (j) => {
    if (!j) return;
    nameDraft.value = j.name;
    addressDraft.value = j.address ?? "";
    statusDraft.value = j.status;
  },
  { immediate: true },
);

watch([nameDraft, addressDraft, statusDraft], () => {
  saved.value = false;
});

async function save() {
  const id = projectId.value;
  const nextName = nameDraft.value.trim();
  const nextAddress = addressDraft.value.trim();
  if (!id) return;
  if (!nextName) {
    error.value = "Vul een projectnaam in.";
    return;
  }
  if (nextAddress.length > 500) {
    error.value = "Adres is te lang (max. 500 tekens).";
    return;
  }
  saving.value = true;
  error.value = "";
  saved.value = false;
  try {
    await jobs.updateJob(id, {
      name: nextName,
      address: nextAddress === "" ? null : nextAddress,
      status: statusDraft.value,
    });
    saved.value = true;
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Kon project niet opslaan";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg">
    <FinbarPageHeader title="Projectinstellingen">
      <template #description>
        Wijzig naam, adres en status van dit project.
      </template>
    </FinbarPageHeader>

    <FinbarCard
      v-if="job"
      as="section"
    >
      <div class="space-y-4">
        <FinbarInput
          id="project-settings-name"
          v-model="nameDraft"
          label="Projectnaam"
          maxlength="200"
          autocomplete="off"
        />
        <FinbarTextarea
          id="project-settings-address"
          v-model="addressDraft"
          label="Adres"
          :rows="3"
          maxlength="500"
          placeholder="Straat, postcode, plaats"
          autocomplete="street-address"
        />
        <FinbarSelect
          id="project-settings-status"
          v-model="statusDraft"
          label="Status"
          hint="Bepaalt hoe dit project in lijsten en overzichten wordt getoond."
        >
          <option
            v-for="(label, key) in JOB_STATUS_LABELS"
            :key="key"
            :value="key"
          >
            {{ label }}
          </option>
        </FinbarSelect>
      </div>
      <p
        v-if="error"
        class="mt-2 text-sm text-red-400"
      >
        {{ error }}
      </p>
      <p
        v-else-if="saved"
        class="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
      >
        Opgeslagen.
      </p>
      <FinbarButton
        type="button"
        class="mt-4"
        variant="secondary"
        :disabled="saving"
        @click="save"
      >
        {{ saving ? "Opslaan…" : "Opslaan" }}
      </FinbarButton>
    </FinbarCard>
    <p
      v-else
      class="text-sm text-zinc-600 dark:text-zinc-400"
    >
      Laden…
    </p>
  </div>
</template>
