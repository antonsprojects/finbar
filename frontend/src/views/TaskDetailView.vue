<script setup lang="ts">
import {
  TASK_STATUS_LABELS,
  type Task,
  type TaskStatus,
  useTasksStore,
} from "@/stores/tasks";
import { useJobsStore } from "@/stores/jobs";
import { useWorkersStore } from "@/stores/workers";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

defineOptions({ name: "TaskDetailView" });

const props = defineProps<{
  id: string;
}>();

const route = useRoute();
const tasks = useTasksStore();
const workers = useWorkersStore();
const jobs = useJobsStore();

const task = ref<Task | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref("");

const title = ref("");
const description = ref("");
const status = ref<TaskStatus>("OPEN");
const scheduledDate = ref("");
const assignedWorkerIds = ref<string[]>([]);

const projectTeamIdSet = computed(() => {
  const jid = task.value?.jobId;
  if (!jid) return new Set<string>();
  return new Set(jobs.scheduledWorkerIdsByJobId[jid] ?? []);
});

const assigneeCheckboxWorkers = computed(() => {
  const selected = new Set(assignedWorkerIds.value);
  return workers.list.filter(
    (w) => projectTeamIdSet.value.has(w.id) || selected.has(w.id),
  );
});

onMounted(() => {
  void workers.fetchList();
});

async function load() {
  loading.value = true;
  error.value = "";
  task.value = null;
  try {
    const t = await tasks.fetchTask(props.id);
    task.value = t;
    if (t) {
      title.value = t.title;
      description.value = t.description ?? "";
      status.value = t.status;
      scheduledDate.value = t.scheduledDate ?? "";
      assignedWorkerIds.value = [...t.assignedWorkerIds];
      await jobs.fetchScheduledWorkerIds(t.jobId);
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Kon taak niet laden";
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
    const updated = await tasks.updateTask(props.id, {
      title: title.value.trim(),
      description: description.value.trim() || null,
      status: status.value,
      scheduledDate: scheduledDate.value.trim() || null,
      assignedWorkerIds: [...assignedWorkerIds.value],
    });
    task.value = updated;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Kon niet opslaan";
  } finally {
    saving.value = false;
  }
}

function toggleWorker(workerId: string, checked: boolean) {
  const cur = assignedWorkerIds.value;
  if (checked) {
    if (!cur.includes(workerId)) assignedWorkerIds.value = [...cur, workerId];
  } else {
    assignedWorkerIds.value = cur.filter((id) => id !== workerId);
  }
}

async function markDone() {
  status.value = "DONE";
  await save();
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink
        v-if="task?.jobId || route.params.projectId"
        :to="{
          name: 'project-planning-today',
          params: {
            projectId: (task?.jobId ?? route.params.projectId) as string,
          },
        }"
        class="finbar-link-back"
      >
        ← Rooster
      </RouterLink>
    </div>

    <p
      v-if="loading"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>
    <p
      v-else-if="error && !task"
      class="text-sm text-red-400"
    >
      {{ error }}
    </p>

    <template v-else-if="task">
      <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">
        Taak
      </h1>
      <p
        v-if="task.job"
        class="text-sm text-zinc-600 dark:text-zinc-300"
      >
        {{ task.job.name }}
      </p>
      <p class="font-mono text-xs text-zinc-600 dark:text-zinc-500">
        {{ task.id }}
      </p>

      <form
        class="space-y-3"
        @submit.prevent="save"
      >
        <div>
          <label
            class="finbar-field-label"
            for="td-title"
          >Titel</label>
          <input
            id="td-title"
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
            for="td-desc"
          >Omschrijving</label>
          <textarea
            id="td-desc"
            v-model="description"
            rows="3"
            maxlength="10000"
            class="finbar-field-input"
          />
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="td-status"
          >Status</label>
          <select
            id="td-status"
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
            for="td-date"
          >Geplande datum</label>
          <input
            id="td-date"
            v-model="scheduledDate"
            type="date"
            class="finbar-field-input"
          >
        </div>
        <div>
          <p class="finbar-field-label">
            Teamleden
          </p>
          <div
            class="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-950/50"
            :class="{
              'pointer-events-none opacity-60': status === 'DONE',
            }"
          >
            <p
              v-if="task && !projectTeamIdSet.size"
              class="text-sm text-zinc-500 dark:text-zinc-400"
            >
              Nog niemand op het projectteam.
              <RouterLink
                :to="{
                  name: 'project-team-pick',
                  params: { projectId: task.jobId },
                }"
                class="finbar-link font-medium"
              >
                Team / netwerk
              </RouterLink>
            </p>
            <template v-else-if="assigneeCheckboxWorkers.length > 0">
              <label
                v-for="w in assigneeCheckboxWorkers"
                :key="w.id"
                class="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
              >
                <input
                  type="checkbox"
                  class="rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
                  :checked="assignedWorkerIds.includes(w.id)"
                  :disabled="status === 'DONE'"
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
            <p
              v-else
              class="text-sm text-zinc-500 dark:text-zinc-400"
            >
              Geen geldige teamleden.
            </p>
          </div>
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
            v-if="status !== 'DONE'"
            type="button"
            class="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
            @click="markDone"
          >
            Markeer als klaar
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
