<script setup lang="ts">
import {
  fetchWorkerScheduleJobs,
  removeWorkerFromScheduleJob,
  type WorkerScheduleJobRow,
} from "@/lib/workerScheduleJobsApi";
import { JOB_STATUS_LABELS, useJobsStore } from "@/stores/jobs";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

defineOptions({ name: "WorkerGegevensProjecten" });

const props = defineProps<{
  workerId: string;
}>();

const route = useRoute();
const jobsStore = useJobsStore();

const rows = ref<WorkerScheduleJobRow[]>([]);
const loading = ref(true);
const loadError = ref("");
const actionError = ref("");
const removingJobId = ref<string | null>(null);

const activeRows = computed(() =>
  rows.value.filter(
    (r) => r.job.status === "PLANNING" || r.job.status === "ACTIVE",
  ),
);

const pastRows = computed(() =>
  rows.value.filter(
    (r) => r.job.status === "COMPLETED" || r.job.status === "ARCHIVED",
  ),
);

async function load() {
  loadError.value = "";
  loading.value = true;
  try {
    rows.value = await fetchWorkerScheduleJobs(props.workerId);
  } catch (e) {
    rows.value = [];
    loadError.value =
      e instanceof Error ? e.message : "Kon projecten niet laden";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

watch(
  () => props.workerId,
  () => {
    void load();
  },
);

function canRemoveProjectRow(row: WorkerScheduleJobRow): boolean {
  return row.assignmentCount === 0;
}

async function removeRow(job: WorkerScheduleJobRow) {
  if (!canRemoveProjectRow(job)) return;
  actionError.value = "";
  removingJobId.value = job.job.id;
  try {
    await removeWorkerFromScheduleJob(props.workerId, job.job.id);
    const pid = route.params.projectId;
    if (typeof pid === "string" && pid) {
      void jobsStore.fetchScheduledWorkerIds(pid);
    }
    await load();
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : "Kon niet verwijderen";
  } finally {
    removingJobId.value = null;
  }
}

function activeSubline(row: WorkerScheduleJobRow): string {
  if (row.assignmentCount === 0) {
    return "Nog niet ingepland op dit project";
  }
  return `${row.assignmentCount} ${row.assignmentCount === 1 ? "dag" : "dagen"} ingepland`;
}

function pastSubline(row: WorkerScheduleJobRow): string {
  const days =
    row.assignmentCount === 0
      ? "Geen ingeplande dagen"
      : `${row.assignmentCount} ${row.assignmentCount === 1 ? "dag" : "dagen"} ingepland`;
  return `${days} · ${JOB_STATUS_LABELS[row.job.status]}`;
}
</script>

<template>
  <div
    v-if="loading || loadError || rows.length > 0"
    class="space-y-5"
  >
    <p
      v-if="loading"
      class="text-sm text-zinc-600 dark:text-zinc-400"
    >
      Laden…
    </p>
    <p
      v-else-if="loadError"
      class="text-sm text-red-400"
    >
      {{ loadError }}
    </p>
    <template v-else>
      <div
        v-if="activeRows.length"
        class="space-y-2"
      >
        <label class="finbar-field-label">Ingepland voor:</label>
        <p
          v-if="actionError"
          class="text-sm text-red-400"
        >
          {{ actionError }}
        </p>
        <div class="flex flex-col gap-3">
          <div
            v-for="row in activeRows"
            :key="row.job.id"
            class="flex w-full items-center gap-3 rounded-[var(--finbar-radius-lg)] border border-zinc-300 bg-white px-5 py-4 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80"
          >
            <div class="min-w-0 flex-1">
              <RouterLink
                :to="{
                  name: 'project-planning-today',
                  params: { projectId: row.job.id },
                }"
                class="text-base font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
              >{{ row.job.name }}</RouterLink>
              <span
                class="mt-1.5 block text-xs leading-snug text-zinc-600 dark:text-zinc-400"
              >{{ activeSubline(row) }}</span>
            </div>
            <button
              type="button"
              class="shrink-0 text-xs font-medium underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-inherit dark:disabled:hover:text-inherit"
              :class="
                canRemoveProjectRow(row)
                  ? 'text-zinc-600 hover:text-red-600 hover:underline dark:text-zinc-400 dark:hover:text-red-400'
                  : 'text-zinc-400 dark:text-zinc-500'
              "
              :disabled="!canRemoveProjectRow(row) || removingJobId === row.job.id"
              :title="
                canRemoveProjectRow(row)
                  ? undefined
                  : 'Verwijder eerst alle ingeplande dagen voor dit project'
              "
              @click="removeRow(row)"
            >
              {{ removingJobId === row.job.id ? "Verwijderen…" : "Verwijderen" }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="pastRows.length"
        class="space-y-2"
      >
        <label class="finbar-field-label">Heeft gewerkt aan:</label>
        <div class="flex flex-col gap-3">
          <div
            v-for="row in pastRows"
            :key="'past-' + row.job.id"
            class="flex w-full items-center gap-3 rounded-[var(--finbar-radius-lg)] border border-zinc-300 bg-white px-5 py-4 text-left transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80"
          >
            <div class="min-w-0 flex-1">
              <RouterLink
                :to="{
                  name: 'project-planning-today',
                  params: { projectId: row.job.id },
                }"
                class="text-base font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
              >{{ row.job.name }}</RouterLink>
              <span
                class="mt-1.5 block text-xs leading-snug text-zinc-600 dark:text-zinc-400"
              >{{ pastSubline(row) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
