<script setup lang="ts">
import FinbarDateField from "@/components/ui/FinbarDateField.vue";
import { TASK_STATUS_LABELS, type TaskStatus, useTasksStore } from "@/stores/tasks";
import { useWorkersStore } from "@/stores/workers";
import { useJobsStore } from "@/stores/jobs";
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";

defineOptions({ name: "TaskNewView" });

const props = defineProps<{
  jobId: string;
}>();

const tasks = useTasksStore();
const workers = useWorkersStore();
const jobs = useJobsStore();
const router = useRouter();

const jobName = ref("");
const title = ref("");
const description = ref("");
const status = ref<TaskStatus>("OPEN");
const scheduledDate = ref("");
const assignedWorkerIds = ref<string[]>([]);
const error = ref("");
const loading = ref(false);

onMounted(async () => {
  try {
    await workers.fetchList();
    const j = await jobs.fetchJob(props.jobId);
    jobName.value = j?.name ?? "";
    await jobs.fetchScheduledWorkerIds(props.jobId);
  } catch {
    jobName.value = "";
  }
});

const projectTeamIdSet = computed(
  () => new Set(jobs.scheduledWorkerIdsByJobId[props.jobId] ?? []),
);

const assigneeCheckboxWorkers = computed(() =>
  workers.list.filter((w) => projectTeamIdSet.value.has(w.id)),
);

function toggleWorker(workerId: string, checked: boolean) {
  const cur = assignedWorkerIds.value;
  if (checked) {
    if (!cur.includes(workerId)) assignedWorkerIds.value = [...cur, workerId];
  } else {
    assignedWorkerIds.value = cur.filter((id) => id !== workerId);
  }
}

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    const t = await tasks.createTask({
      jobId: props.jobId,
      title: title.value.trim(),
      description: description.value.trim() || null,
      status: status.value,
      scheduledDate: scheduledDate.value.trim() || null,
      assignedWorkerIds: [...assignedWorkerIds.value],
    });
    await router.push({
      name: "project-task-detail",
      params: { projectId: props.jobId, taskId: t.id },
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Kon taak niet aanmaken";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink
        :to="{ name: 'project-planning-today', params: { projectId: jobId } }"
        class="finbar-link-back"
      >
        ← Rooster
      </RouterLink>
    </div>
    <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">Nieuwe taak</h1>
    <p
      v-if="jobName"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      {{ jobName }}
    </p>

    <form
      class="space-y-3"
      @submit.prevent="onSubmit"
    >
      <div>
        <label
          class="finbar-field-label"
          for="tn-title"
        >Titel</label>
        <input
          id="tn-title"
          v-model="title"
          type="text"
          required
          maxlength="200"
          class="finbar-field-input"
        >
      </div>
      <div>
        <label
          class="finbar-field-label"
          for="tn-desc"
        >Omschrijving</label>
        <textarea
          id="tn-desc"
          v-model="description"
          rows="3"
          maxlength="10000"
          class="finbar-field-input"
        />
      </div>
      <div>
        <label
          class="finbar-field-label"
          for="tn-status"
        >Status</label>
        <select
          id="tn-status"
          v-model="status"
          class="finbar-field-input"
        >
          <option
            v-for="(label, key) in TASK_STATUS_LABELS"
            :key="key"
            :value="key"
          >
            {{ label }}
          </option>
        </select>
      </div>
      <div>
        <label
          class="finbar-field-label"
          for="tn-date"
        >Geplande datum</label>
        <FinbarDateField
          id="tn-date"
          v-model="scheduledDate"
        />
      </div>
      <div>
        <p class="finbar-field-label">
          Teamleden toevoegen aan taak (optioneel)
        </p>
        <div
          class="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-950/50"
        >
          <p
            v-if="!projectTeamIdSet.size"
            class="text-sm text-zinc-500 dark:text-zinc-400"
          >
            Nog niemand op het projectteam. Voeg eerst contacten toe via
            <RouterLink
              :to="{ name: 'project-team-pick', params: { projectId: jobId } }"
              class="finbar-link font-medium"
            >
              Team / netwerk
            </RouterLink>
            ; daarna kunnen ze op taken worden gezet.
          </p>
          <template v-else>
            <label
              v-for="w in assigneeCheckboxWorkers"
              :key="w.id"
              class="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
            >
              <input
                type="checkbox"
                class="rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
                :checked="assignedWorkerIds.includes(w.id)"
                @change="
                  toggleWorker(
                    w.id,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              >
              <span>{{ w.name }}{{ w.trade ? ` — ${w.trade}` : "" }}</span>
            </label>
          </template>
        </div>
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
        {{ loading ? "Opslaan…" : "Taak aanmaken" }}
      </button>
    </form>
  </div>
</template>
