<script setup lang="ts">
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import { JOB_STATUS_LABELS, type JobStatus, useJobsStore } from "@/stores/jobs";
import { ref, watch } from "vue";
import { useRouter } from "vue-router";

defineOptions({ name: "JobNewView" });

const jobs = useJobsStore();
const router = useRouter();

const name = ref("");
const address = ref("");
const notes = ref("");
const status = ref<JobStatus>("PLANNING");
const error = ref("");
const loading = ref(false);
const modalOpen = ref(true);

function close() {
  modalOpen.value = false;
}

watch(modalOpen, (open) => {
  if (!open) {
    void router.push({ name: "home" });
  }
});

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    const job = await jobs.createJob({
      name: name.value.trim(),
      address: address.value.trim() || null,
      notes: notes.value.trim() || null,
      status: status.value,
    });
    await router.push({
      name: "project-planning-today",
      params: { projectId: job.id },
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Kon project niet aanmaken";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <TodayModalShell v-model="modalOpen">
    <h2 class="finbar-modal-title mb-4">
      Project toevoegen
    </h2>
    <form
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <div>
        <label
          class="finbar-field-label"
          for="jn-name"
        >Naam</label>
        <input
          id="jn-name"
          v-model="name"
          type="text"
          required
          maxlength="200"
          class="finbar-field-input"
          autocomplete="off"
        >
      </div>
      <div>
        <label
          class="finbar-field-label"
          for="jn-address"
        >Adres</label>
        <input
          id="jn-address"
          v-model="address"
          type="text"
          maxlength="500"
          class="finbar-field-input"
          autocomplete="street-address"
        >
      </div>
      <div>
        <label
          class="finbar-field-label"
          for="jn-notes"
        >Notities</label>
        <textarea
          id="jn-notes"
          v-model="notes"
          rows="3"
          maxlength="10000"
          class="finbar-field-input"
        />
      </div>
      <div>
        <label
          class="finbar-field-label"
          for="jn-status"
        >Status</label>
        <select
          id="jn-status"
          v-model="status"
          class="finbar-field-input"
        >
          <option
            v-for="(label, key) in JOB_STATUS_LABELS"
            :key="key"
            :value="key"
          >
            {{ label }}
          </option>
        </select>
      </div>

      <p
        v-if="error"
        class="text-sm text-red-400"
      >
        {{ error }}
      </p>

      <div
        class="flex flex-col gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 dark:border-zinc-800"
      >
        <div class="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:gap-2">
          <button
            type="submit"
            :disabled="loading"
            class="finbar-btn-primary-sm min-w-0 justify-center"
          >
            {{ loading ? "Opslaan…" : "Project toevoegen" }}
          </button>
          <button
            type="button"
            class="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 sm:border-0 sm:bg-transparent sm:px-3 sm:py-1.5 sm:text-zinc-600 sm:hover:bg-zinc-100 sm:dark:hover:bg-zinc-800"
            :disabled="loading"
            @click="close"
          >
            Annuleren
          </button>
        </div>
      </div>
    </form>
  </TodayModalShell>
</template>
