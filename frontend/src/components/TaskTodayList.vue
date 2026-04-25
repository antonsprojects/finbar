<script setup lang="ts">
import type { TodayTask } from "@/stores/today";
import type { Worker } from "@/stores/workers";
import { computed } from "vue";

defineOptions({ name: "TaskTodayList" });

const props = withDefaults(
  defineProps<{
    tasks: TodayTask[];
    workers: Worker[];
    /** Wie staat op die dag in het team; die namen in de to-do krijgen volle (donkere) tekst. */
    scheduledWorkerIds?: string[];
    pendingTaskId: string | null;
  }>(),
  { scheduledWorkerIds: () => [] },
);

const emit = defineEmits<{
  /** `true` = klaar (DONE), `false` = weer open (OPEN). */
  toggleDone: [taskId: string, completed: boolean];
  openTaskEdit: [task: TodayTask];
}>();

function onRowClick(_ev: MouseEvent, task: TodayTask) {
  emit("openTaskEdit", task);
}

function onRowKey(_ev: KeyboardEvent, task: TodayTask) {
  emit("openTaskEdit", task);
}

const scheduledSet = computed(
  () => new Set(props.scheduledWorkerIds ?? []),
);

function assigneeRows(t: TodayTask): { id: string; name: string }[] {
  if (t.assignedWorkers?.length) {
    return t.assignedWorkers.map((w) => ({ id: w.id, name: w.name }));
  }
  const ids = t.assignedWorkerIds ?? [];
  const out: { id: string; name: string }[] = [];
  for (const id of ids) {
    const w = props.workers.find((x) => x.id === id);
    if (w) out.push({ id, name: w.name });
  }
  return out;
}

function assigneeNameClass(workerId: string): string {
  if (scheduledSet.value.size === 0) {
    return "text-zinc-600 dark:text-zinc-500";
  }
  return scheduledSet.value.has(workerId)
    ? "font-medium text-zinc-900 dark:text-zinc-100"
    : "text-zinc-500 dark:text-zinc-500";
}
</script>

<template>
  <div>
    <ul
      v-if="tasks.length > 0"
      class="finbar-list-shell text-sm"
    >
      <li
        v-for="t in tasks"
        :key="t.id"
      >
        <div
          role="button"
          tabindex="0"
          class="finbar-list-row !flex-row cursor-pointer items-center gap-3 text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400/40 dark:text-zinc-100 dark:focus-visible:ring-zinc-500/40"
          @click="onRowClick($event, t)"
          @keydown.enter.prevent="onRowKey($event, t)"
          @keydown.space.prevent="onRowKey($event, t)"
        >
          <label
            class="flex shrink-0 cursor-pointer items-center"
            @click.stop
          >
            <span class="sr-only">Taak voltooid</span>
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:focus:ring-emerald-600"
              :checked="t.status === 'DONE'"
              :disabled="pendingTaskId === t.id"
              @change="
                emit(
                  'toggleDone',
                  t.id,
                  ($event.target as HTMLInputElement).checked,
                )
              "
            >
          </label>
          <div
            class="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <span class="min-w-0 break-words font-medium">{{ t.title }}</span>
            <p
              v-if="assigneeRows(t).length"
              class="shrink-0 text-xs sm:text-right whitespace-nowrap"
            >
              <template
                v-for="(a, i) in assigneeRows(t)"
                :key="a.id"
              >
                <span
                  v-if="i > 0"
                  class="text-zinc-500"
                >, </span>
                <span :class="assigneeNameClass(a.id)">{{ a.name }}</span>
              </template>
            </p>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
