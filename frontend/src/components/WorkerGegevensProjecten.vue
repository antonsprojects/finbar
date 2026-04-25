<script setup lang="ts">
import {
  fetchWorkerScheduleJobs,
  removeWorkerFromScheduleJob,
  type WorkerScheduleJobRow,
} from "@/lib/workerScheduleJobsApi";
import { useJobsStore } from "@/stores/jobs";
import { onMounted, ref, watch } from "vue";
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

async function removeRow(job: WorkerScheduleJobRow) {
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
</script>

<template>
  <div
    v-if="loading || loadError || rows.length > 0"
    class="space-y-1"
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
      <label class="finbar-field-label">Ingepland voor:</label>
      <p
        v-if="actionError"
        class="text-sm text-red-400"
      >
        {{ actionError }}
      </p>
      <ul
        class="finbar-list-shell text-sm"
      >
        <li
          v-for="row in rows"
          :key="row.job.id"
          class="finbar-list-row flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0 text-zinc-900 dark:text-zinc-100">
            <RouterLink
              :to="{
                name: 'project-planning-today',
                params: { projectId: row.job.id },
              }"
              class="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100"
            >{{ row.job.name }}</RouterLink>
            <span
              class="ml-1.5 text-xs text-zinc-500 dark:text-zinc-400"
            >({{ row.assignmentCount }}
              {{ row.assignmentCount === 1 ? "dag" : "dagen" }})</span>
          </div>
          <button
            type="button"
            class="shrink-0 self-end text-xs font-medium text-zinc-600 underline-offset-2 hover:text-red-600 hover:underline dark:text-zinc-400 sm:self-auto dark:hover:text-red-400"
            :disabled="removingJobId === row.job.id"
            @click="removeRow(row)"
          >
            {{ removingJobId === row.job.id ? "Verwijderen…" : "Verwijderen" }}
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>
