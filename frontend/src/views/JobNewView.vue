<script setup lang="ts">
import { JOB_STATUS_LABELS, type JobStatus, useJobsStore } from "@/stores/jobs";
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";

defineOptions({ name: "JobNewView" });

const jobs = useJobsStore();
const router = useRouter();

const name = ref("");
const address = ref("");
const notes = ref("");
const status = ref<JobStatus>("PLANNING");
const error = ref("");
const loading = ref(false);

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
  <div class="mx-auto max-w-lg space-y-4">
    <div class="flex items-center gap-3">
      <RouterLink
        to="/"
        class="finbar-link-back"
      >
        ← Projecten
      </RouterLink>
    </div>
    <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">Nieuw project</h1>

    <form
      class="space-y-3"
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

      <button
        type="submit"
        :disabled="loading"
        class="finbar-btn-primary"
      >
        {{ loading ? "Opslaan…" : "Project aanmaken" }}
      </button>
    </form>
  </div>
</template>
