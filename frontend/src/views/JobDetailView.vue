<script setup lang="ts">
import {
  JOB_STATUS_LABELS,
  type Job,
  type JobStatus,
  useJobsStore,
} from "@/stores/jobs";
import { TASK_STATUS_LABELS, useTasksStore } from "@/stores/tasks";
import { ref, watch } from "vue";
import { RouterLink } from "vue-router";

defineOptions({ name: "JobDetailView" });

const props = defineProps<{
  id: string;
}>();

const jobs = useJobsStore();
const tasksStore = useTasksStore();

const job = ref<Job | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref("");

const name = ref("");
const address = ref("");
const notes = ref("");
const status = ref<JobStatus>("PLANNING");

async function load() {
  loading.value = true;
  error.value = "";
  job.value = null;
  try {
    const j = await jobs.fetchJob(props.id);
    job.value = j;
    if (j) {
      name.value = j.name;
      address.value = j.address ?? "";
      notes.value = j.notes ?? "";
      status.value = j.status;
      await tasksStore.fetchList({ jobId: props.id });
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Kon project niet laden";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.id,
  () => {
    void load();
  },
  { immediate: true },
);

async function save() {
  saving.value = true;
  error.value = "";
  try {
    const updated = await jobs.updateJob(props.id, {
      name: name.value.trim(),
      address: address.value.trim() || null,
      notes: notes.value.trim() || null,
      status: status.value,
    });
    job.value = updated;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Kon niet opslaan";
  } finally {
    saving.value = false;
  }
}

async function setStatus(next: JobStatus) {
  status.value = next;
  await save();
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4">
    <div class="flex items-center gap-3">
      <RouterLink
        :to="{ name: 'project-planning-today', params: { projectId: props.id } }"
        class="finbar-link-back"
      >
        ← Vandaag
      </RouterLink>
    </div>

    <p
      v-if="loading"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>
    <p
      v-else-if="error && !job"
      class="text-sm text-red-400"
    >
      {{ error }}
    </p>

    <template v-else-if="job">
      <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">
        Project bewerken
      </h1>
      <p class="font-mono text-xs text-zinc-600 dark:text-zinc-500">
        {{ job.id }}
      </p>

      <form
        class="space-y-3"
        @submit.prevent="save"
      >
        <div>
          <label
            class="finbar-field-label"
            for="jd-name"
          >Naam</label>
          <input
            id="jd-name"
            v-model="name"
            type="text"
            required
            maxlength="200"
            class="finbar-field-input"
          >
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="jd-address"
          >Adres</label>
          <input
            id="jd-address"
            v-model="address"
            type="text"
            maxlength="500"
            class="finbar-field-input"
          >
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="jd-notes"
          >Notities</label>
          <textarea
            id="jd-notes"
            v-model="notes"
            rows="3"
            maxlength="10000"
            class="finbar-field-input"
          />
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="jd-status"
          >Status</label>
          <select
            id="jd-status"
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

        <div class="flex flex-wrap gap-2">
          <button
            type="submit"
            :disabled="saving"
            class="finbar-btn-primary"
          >
            {{ saving ? "Opslaan…" : "Opslaan" }}
          </button>
          <button
            v-if="status !== 'ACTIVE'"
            type="button"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
            @click="setStatus('ACTIVE')"
          >
            Actief zetten
          </button>
          <button
            v-if="status !== 'COMPLETED'"
            type="button"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
            @click="setStatus('COMPLETED')"
          >
            Afronden
          </button>
          <button
            v-if="status !== 'ARCHIVED'"
            type="button"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
            @click="setStatus('ARCHIVED')"
          >
            Archiveren
          </button>
        </div>
      </form>

      <section
        class="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800"
        aria-labelledby="job-tasks-heading"
      >
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2
            id="job-tasks-heading"
            class="text-lg font-medium text-zinc-900 dark:text-white"
          >
            Taken
          </h2>
          <RouterLink
            :to="{
              name: 'project-task-new',
              params: { projectId: job.id },
            }"
            class="rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Taak toevoegen
          </RouterLink>
        </div>

        <p
          v-if="tasksStore.listLoading"
          class="text-sm text-zinc-600 dark:text-zinc-300"
        >
          Taken laden…
        </p>
        <p
          v-else-if="tasksStore.listError"
          class="text-sm text-red-400"
        >
          {{ tasksStore.listError }}
        </p>
        <ul
          v-else-if="tasksStore.list.length"
          class="finbar-list-shell"
        >
          <li
            v-for="t in tasksStore.list"
            :key="t.id"
          >
            <RouterLink
              :to="{
                name: 'project-task-detail',
                params: { projectId: job.id, taskId: t.id },
              }"
              class="finbar-list-row text-zinc-900 dark:text-zinc-100"
            >
              <span class="font-medium">{{ t.title }}</span>
              <span class="text-xs text-zinc-600 dark:text-zinc-500">
                {{ TASK_STATUS_LABELS[t.status] }}
                <span
                  v-if="t.scheduledDate"
                  class="text-zinc-600 dark:text-zinc-400"
                > · {{ t.scheduledDate }}</span>
              </span>
            </RouterLink>
          </li>
        </ul>
        <p
          v-else
          class="text-sm text-zinc-600 dark:text-zinc-300"
        >
          Nog geen taken voor dit project.
        </p>
      </section>
    </template>
  </div>
</template>
