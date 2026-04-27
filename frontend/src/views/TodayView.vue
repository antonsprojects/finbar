<script setup lang="ts">
import TaskTodayList from "@/components/TaskTodayList.vue";
import TodayAddWorkerPopover from "@/components/TodayAddWorkerPopover.vue";
import TodayCrewList from "@/components/TodayCrewList.vue";
import type { TodayCrewRow, TodayDayBlock, TodayTask } from "@/stores/today";
import { addDaysFromYmd, formatLocalYmd } from "@/lib/localDate";
import { useJobsStore } from "@/stores/jobs";
import { useTasksStore } from "@/stores/tasks";
import { useTodayStore } from "@/stores/today";
import { useWorkersStore } from "@/stores/workers";
import TodayAddTaskPopover from "@/components/TodayAddTaskPopover.vue";
import TodayAddToolbarButton from "@/components/TodayAddToolbarButton.vue";
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

defineOptions({ name: "TodayView" });

const RANGE_DAYS = 7;

const route = useRoute();
const today = useTodayStore();
const tasks = useTasksStore();
const workers = useWorkersStore();
const jobs = useJobsStore();

const pendingTaskId = ref<string | null>(null);

const projectId = computed(() => route.params.projectId as string);

const calendarTodayYmd = computed(() => formatLocalYmd(new Date()));

/** Offset t.o.v. echte vandaag (0 = vandaag, -1 = gisteren). */
const dayOffset = ref(0);

const currentYmd = computed(() =>
  addDaysFromYmd(calendarTodayYmd.value, dayOffset.value),
);

const pickerOpen = ref(false);
const datePickerRoot = ref<HTMLElement | null>(null);

function closePickerOnOutside(ev: MouseEvent | PointerEvent) {
  const el = datePickerRoot.value;
  if (!el || !pickerOpen.value) return;
  const t = ev.target;
  if (t instanceof Node && el.contains(t)) return;
  pickerOpen.value = false;
}

const calMonth = ref(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
);

const calMonthTitle = computed(() =>
  new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    year: "numeric",
  }).format(calMonth.value),
);

const dayHeaders = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] as const;

const leadingBlanks = computed(() => {
  const dow = calMonth.value.getDay();
  return dow === 0 ? 6 : dow - 1;
});

const daysInMonth = computed(() => {
  const y = calMonth.value.getFullYear();
  const m = calMonth.value.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: last }, (_, i) => {
    const d = i + 1;
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return { d, ymd: `${y}-${mm}-${dd}` };
  });
});

/** Eén grid met weekdagen + dagen zodat kolommen gelijk lopen. */
type CalBodyCell =
  | { kind: "blank"; key: string }
  | { kind: "day"; d: number; ymd: string };

const calendarBodyCells = computed((): CalBodyCell[] => {
  const out: CalBodyCell[] = [];
  for (let i = 0; i < leadingBlanks.value; i++) {
    out.push({ kind: "blank", key: `b${i}` });
  }
  for (const day of daysInMonth.value) {
    out.push({ kind: "day", d: day.d, ymd: day.ymd });
  }
  return out;
});

function dayBlockHeading(ymd: string): string {
  const calToday = calendarTodayYmd.value;
  const calTomorrow = addDaysFromYmd(calToday, 1);
  const calYesterday = addDaysFromYmd(calToday, -1);

  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);

  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const dateStr = `${dd}/${mm}/${y}`;

  if (ymd === calToday) return `Vandaag, ${dateStr}`;
  if (ymd === calTomorrow) return `Morgen, ${dateStr}`;
  if (ymd === calYesterday) return `Gisteren, ${dateStr}`;

  const weekday = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
  }).format(dt);
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dateStr}`;
}

const currentHeading = computed(() => dayBlockHeading(currentYmd.value));

function prevCalMonth() {
  const d = calMonth.value;
  calMonth.value = new Date(d.getFullYear(), d.getMonth() - 1, 1);
}

function nextCalMonth() {
  const d = calMonth.value;
  calMonth.value = new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function changeDay(delta: number) {
  dayOffset.value += delta;
  pickerOpen.value = false;
}

function goToday() {
  dayOffset.value = 0;
  pickerOpen.value = false;
  const n = new Date();
  calMonth.value = new Date(n.getFullYear(), n.getMonth(), 1);
}

function pickDate(ymd: string) {
  const todayYmd = calendarTodayYmd.value;
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const [py, pm, pd] = ymd.split("-").map(Number);
  const diff = Math.round(
    (new Date(py, pm - 1, pd).getTime() - new Date(ty, tm - 1, td).getTime()) /
      86400000,
  );
  dayOffset.value = diff;
  pickerOpen.value = false;
}

watch(pickerOpen, (open) => {
  if (open) {
    const [yy, mm] = currentYmd.value.split("-").map(Number);
    if (!Number.isNaN(yy) && !Number.isNaN(mm)) {
      calMonth.value = new Date(yy, mm - 1, 1);
    }
    void nextTick().then(() => {
      if (!pickerOpen.value) return;
      document.addEventListener("pointerdown", closePickerOnOutside, true);
    });
  } else {
    document.removeEventListener("pointerdown", closePickerOnOutside, true);
  }
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", closePickerOnOutside, true);
});

watch(
  () => [projectId.value, dayOffset.value] as const,
  (curr, prev) => {
    const [id, off] = curr;
    const prevId = prev?.[0];
    if (prevId !== undefined && prevId !== id) {
      if (off !== 0) {
        dayOffset.value = 0;
        return;
      }
    }
    void load();
  },
);

async function load() {
  await Promise.all([
    workers.fetchList(),
    today.fetchTodayRange(currentYmd.value, RANGE_DAYS, projectId.value),
    jobs.fetchScheduledWorkerIds(projectId.value),
  ]);
}

void load();

async function refresh() {
  await Promise.all([
    today.fetchTodayRange(
      currentYmd.value,
      RANGE_DAYS,
      projectId.value,
    ),
    jobs.fetchScheduledWorkerIds(projectId.value),
  ]);
}

function uniqueCrewByWorker(crew: TodayCrewRow[]): TodayCrewRow[] {
  const map = new Map<string, TodayCrewRow>();
  for (const row of crew) {
    if (!map.has(row.workerId)) {
      map.set(row.workerId, row);
    }
  }
  return [...map.values()].sort((a, b) =>
    a.workerName.localeCompare(b.workerName, "nl", { sensitivity: "base" }),
  );
}

function tasksForDayBlock(block: TodayDayBlock): TodayTask[] {
  if (block.date === calendarTodayYmd.value) {
    const seen = new Set<string>();
    const out: TodayTask[] = [];
    for (const list of [
      block.payload.tasksOverdue,
      block.payload.tasksDueToday,
      block.payload.tasksUnassigned,
    ]) {
      for (const t of list) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          out.push(t);
        }
      }
    }
    return out;
  }
  return [...block.payload.tasksDueToday];
}

const currentRow = computed(() => {
  const block = today.rangeDays.find((b) => b.date === currentYmd.value);
  if (!block) return null;
  return {
    block,
    crewList: uniqueCrewByWorker(block.payload.crew),
    tasks: tasksForDayBlock(block),
  };
});

/** Teamleden die op de gekozen dag ingepland staan (voor contrast in taaktoewijzing). */
const scheduledWorkerIdsForDay = computed(() => {
  const row = currentRow.value;
  if (!row) return [] as string[];
  return row.crewList.map((c) => c.workerId);
});

const scheduleWarningsForView = computed(
  () => currentRow.value?.block.payload.scheduleWarnings ?? [],
);

const usedBudgetLineIdsForDay = computed((): string[] => {
  const row = currentRow.value;
  if (!row) return [];
  return row.tasks
    .map((t) => t.budgetLineId)
    .filter((id): id is string => id != null && id !== "");
});

type TaskPopExpose = InstanceType<typeof TodayAddTaskPopover>;
type WorkerPopExpose = InstanceType<typeof TodayAddWorkerPopover>;

const taskPopRef = ref<TaskPopExpose | null>(null);
const workerPopRef = ref<WorkerPopExpose | null>(null);

function onOpenTaskEdit(task: TodayTask) {
  taskPopRef.value?.openEditFromRow(task);
}

async function toggleTaskDone(taskId: string, completed: boolean) {
  pendingTaskId.value = taskId;
  try {
    await tasks.updateTask(taskId, {
      status: completed ? "DONE" : "OPEN",
    });
    await refresh();
  } finally {
    pendingTaskId.value = null;
  }
}
</script>

<template>
  <div class="space-y-3">
    <p
      v-if="today.loading && today.rangeDays.length === 0"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>
    <p
      v-else-if="today.error"
      class="text-sm text-red-400"
    >
      {{ today.error }}
    </p>

    <div
      v-if="scheduleWarningsForView.length > 0"
      class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <p class="font-semibold text-zinc-900 dark:text-amber-50">
        Rooster en beschikbaarheid (deze dag)
      </p>
      <ul
        class="mt-1.5 list-inside list-disc space-y-1 text-zinc-800 dark:text-zinc-200"
      >
        <li
          v-for="(w, i) in scheduleWarningsForView"
          :key="`${w.workerId}-${i}`"
        >
          <RouterLink
            :to="{
              name: 'project-worker-detail',
              params: { projectId, id: w.workerId },
            }"
            class="font-medium text-amber-900 underline decoration-amber-300 underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:decoration-amber-600/60 dark:hover:text-amber-50"
          >
            {{ w.workerName }}
          </RouterLink>
          staat als niet beschikbaar maar is ingepland op
          <strong class="font-semibold text-zinc-900 dark:text-zinc-100">{{
            w.jobName
          }}</strong>
          <span v-if="w.availabilityNotes"> ({{ w.availabilityNotes }})</span>.
        </li>
      </ul>
    </div>

    <div
      v-if="!today.loading || today.rangeDays.length > 0"
      class="space-y-4"
    >
      <article
        v-if="currentRow"
        class="finbar-page-article-shell"
      >
        <TodayAddWorkerPopover
          ref="workerPopRef"
          hide-trigger
          :project-id="projectId"
          :date-ymd="currentYmd"
          :project-team-worker-ids="jobs.scheduledWorkerIdsByJobId[projectId] ?? []"
          :existing-worker-ids="currentRow.crewList.map((c) => c.workerId)"
          :availability-today="currentRow.block.payload.availabilityToday"
          @added="refresh"
        />
        <TodayAddTaskPopover
          ref="taskPopRef"
          hide-trigger
          :project-id="projectId"
          :date-ymd="currentYmd"
          :project-team-worker-ids="jobs.scheduledWorkerIdsByJobId[projectId] ?? []"
          :used-budget-line-ids="usedBudgetLineIdsForDay"
          :availability-today="currentRow.block.payload.availabilityToday"
          @created="refresh"
        />

        <header
          class="border-b border-zinc-200/90 pb-2 dark:border-zinc-700/80"
        >
          <div class="space-y-2">
            <div
              class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
            >
            <div
              ref="datePickerRoot"
              class="relative flex w-full min-w-0 max-w-full flex-1 items-center gap-1 self-center px-0.5 max-md:max-w-none md:w-max md:max-w-full md:shrink"
            >
              <button
                type="button"
                class="finbar-icon-circle-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white p-0 text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 md:hidden dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-200 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-500/50"
                aria-label="Vorige dag"
                @click="changeDay(-1)"
              >
                <svg
                  class="h-[1.125rem] w-[1.125rem] shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M10 12L6 8l4-4"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    vector-effect="non-scaling-stroke"
                  />
                </svg>
              </button>

              <button
                type="button"
                class="group finbar-pill-min-h -outline-offset-2 flex min-w-0 max-md:min-w-0 max-md:flex-1 max-md:justify-center max-md:px-1 max-md:text-center items-center gap-0.5 rounded-sm px-0.5 py-0 text-left transition-colors hover:bg-zinc-200/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 md:max-w-full dark:hover:bg-zinc-800/50 dark:focus-visible:ring-zinc-500/50"
                aria-label="Kies datum"
                :aria-expanded="pickerOpen"
                aria-haspopup="dialog"
                @click.stop="pickerOpen = !pickerOpen"
              >
                <span
                  class="min-w-0 truncate text-base font-semibold text-zinc-900 max-md:tabular-nums dark:text-white"
                >
                  {{ currentHeading }}
                </span>
                <span
                  class="flex shrink-0 items-center text-zinc-500 transition-transform group-hover:text-zinc-600 max-md:min-w-0 dark:text-zinc-400 dark:group-hover:text-zinc-200"
                  :class="{ 'rotate-180': pickerOpen }"
                  aria-hidden="true"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </button>

              <button
                type="button"
                class="finbar-icon-circle-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white p-0 text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 md:hidden dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-200 dark:shadow-none dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-500/50"
                aria-label="Volgende dag"
                @click="changeDay(1)"
              >
                <svg
                  class="h-[1.125rem] w-[1.125rem] shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    stroke-width="1.75"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    vector-effect="non-scaling-stroke"
                  />
                </svg>
              </button>

              <div
                v-if="pickerOpen"
                class="absolute top-full z-30 mt-2 w-60 max-w-[min(15rem,calc(100vw-2rem))] rounded-xl border border-zinc-300 bg-white p-3 shadow-lg max-md:left-1/2 max-md:-translate-x-1/2 md:left-0 dark:border-zinc-700 dark:bg-zinc-900"
                role="dialog"
                aria-label="Kalender"
                @click.stop
              >
                <div class="mb-2 flex items-center justify-between">
                  <button
                    type="button"
                    class="rounded px-2 py-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Vorige maand"
                    @click="prevCalMonth"
                  >
                    ‹
                  </button>
                  <span
                    class="text-center text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-100"
                  >
                    {{ calMonthTitle }}
                  </span>
                  <button
                    type="button"
                    class="rounded px-2 py-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                    aria-label="Volgende maand"
                    @click="nextCalMonth"
                  >
                    ›
                  </button>
                </div>

                <div
                  class="grid min-w-0 grid-cols-7 gap-x-0.5 gap-y-0.5"
                >
                  <span
                    v-for="h in dayHeaders"
                    :key="h"
                    class="flex items-center justify-center py-1 text-center text-[0.6875rem] font-semibold text-zinc-400 dark:text-zinc-500"
                  >{{ h }}</span>
                  <template
                    v-for="cell in calendarBodyCells"
                    :key="cell.kind === 'day' ? cell.ymd : cell.key"
                  >
                    <span
                      v-if="cell.kind === 'blank'"
                      class="min-h-9 min-w-0"
                      aria-hidden="true"
                    />
                    <button
                      v-else
                      type="button"
                      class="flex min-h-9 min-w-0 w-full items-center justify-center rounded py-1 text-center text-sm font-normal tabular-nums"
                      :class="[
                        cell.ymd === currentYmd
                          ? 'bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : cell.ymd === calendarTodayYmd
                            ? 'border border-zinc-400 text-zinc-800 dark:border-zinc-500 dark:text-zinc-100'
                            : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
                      ]"
                      @click="pickDate(cell.ymd)"
                    >
                      {{ cell.d }}
                    </button>
                  </template>
                </div>
                <button
                  type="button"
                  class="mt-3 block w-full rounded-md border border-zinc-300 bg-zinc-50 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 md:hidden dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  @click="goToday"
                >
                  Vandaag
                </button>
              </div>
            </div>

            <div
              class="hidden shrink-0 flex-wrap items-center justify-end gap-2 self-center md:flex"
            >
              <div class="hidden items-center gap-2 md:flex">
                <TodayAddToolbarButton
                  pill
                  label="Teamlid inplannen"
                  @click="workerPopRef?.open()"
                />
                <TodayAddToolbarButton
                  pill
                  label="Taak toevoegen"
                  @click="taskPopRef?.openCreate()"
                />
              </div>
              <div
                class="finbar-pill-height inline-flex shrink-0 items-stretch overflow-hidden rounded-full border border-zinc-300 bg-white text-sm shadow-sm dark:border-zinc-600 dark:bg-zinc-900/90"
                role="group"
                aria-label="Dag navigatie"
              >
              <button
                type="button"
                class="flex h-full min-h-0 min-w-0 items-center justify-center px-2.5 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Vorige dag"
                @click="changeDay(-1)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M10 12L6 8l4-4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="flex h-full min-h-0 min-w-0 items-center border-x border-zinc-200 bg-white px-3 font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Spring naar vandaag"
                @click="goToday"
              >
                Vandaag
              </button>
              <button
                type="button"
                class="flex h-full min-h-0 min-w-0 items-center justify-center px-2.5 text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Volgende dag"
                @click="changeDay(1)"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              </div>
            </div>
            </div>

            <div
              class="grid w-full min-w-0 grid-cols-2 gap-2 md:hidden"
            >
              <TodayAddToolbarButton
                pill
                full-width
                mobile-add-toolbar-layout
                label="Teamleden"
                accessibility-label="Teamlid inplannen"
                @click="workerPopRef?.open()"
              />
              <TodayAddToolbarButton
                pill
                full-width
                mobile-add-toolbar-layout
                label="Taken"
                accessibility-label="Taak toevoegen"
                @click="taskPopRef?.openCreate()"
              />
            </div>
          </div>
        </header>

        <div class="mt-2.5 space-y-3 finbar-inset-bleed">
          <section class="space-y-2">
            <template v-if="currentRow.crewList.length > 0">
              <h3
                class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                Team
              </h3>
              <TodayCrewList
                layout="chips"
                :crew="currentRow.crewList"
                :availability-today="currentRow.block.payload.availabilityToday"
                @notes-updated="refresh"
              />
            </template>
            <p
              v-else
              class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
            >
              Nog niemand staat ingepland voor deze dag.
            </p>
          </section>

          <section class="space-y-2">
            <template v-if="currentRow.tasks.length > 0">
              <h3
                class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                Taken
              </h3>
              <TaskTodayList
                :tasks="currentRow.tasks"
                :workers="workers.list"
                :scheduled-worker-ids="scheduledWorkerIdsForDay"
                :pending-task-id="pendingTaskId"
                @toggle-done="toggleTaskDone"
                @open-task-edit="onOpenTaskEdit"
              />
            </template>
            <p
              v-else
              class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
            >
              Nog geen taken gekozen voor deze dag
            </p>
          </section>
        </div>
      </article>

      <p
        v-else-if="!today.loading"
        class="text-sm text-zinc-600 dark:text-zinc-400"
      >
        Kon deze dag niet laden.
      </p>
    </div>
  </div>
</template>
