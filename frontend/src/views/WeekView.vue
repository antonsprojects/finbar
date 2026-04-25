<script setup lang="ts">
import WeekPlannerPanel from "@/components/WeekPlannerPanel.vue";
import { useJobsStore } from "@/stores/jobs";
import { useScheduleAssignmentsStore } from "@/stores/scheduleAssignments";
import type {
  WorkerAvailabilityRow,
  WorkerAvailabilityStatus,
} from "@/stores/workerAvailability";
import { useWorkerAvailabilityStore } from "@/stores/workerAvailability";
import { useWorkersStore } from "@/stores/workers";
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

defineOptions({ name: "WeekView" });

const route = useRoute();
const projectId = computed(() => route.params.projectId as string);

const workersStore = useWorkersStore();
const jobsStore = useJobsStore();
const availabilityStore = useWorkerAvailabilityStore();
const scheduleStore = useScheduleAssignmentsStore();

const weekTab = ref<"availability" | "planner">("availability");

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const weekStart = ref(startOfWeekMonday(new Date()));

const weekDays = computed(() => {
  const out: { date: Date; ymd: string; label: string }[] = [];
  const short = new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
  });
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart.value, i);
    out.push({
      date,
      ymd: formatLocalYmd(date),
      label: short.format(date),
    });
  }
  return out;
});

const rangeLabel = computed(() => {
  const a = weekDays.value[0]?.date;
  const b = weekDays.value[6]?.date;
  if (!a || !b) return "";
  const fmt = new Intl.DateTimeFormat("nl-NL", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fmt.format(a)} – ${fmt.format(b)}`;
});

function prevWeek() {
  weekStart.value = addDays(weekStart.value, -7);
}

function nextWeek() {
  weekStart.value = addDays(weekStart.value, 7);
}

function thisWeek() {
  weekStart.value = startOfWeekMonday(new Date());
}

const cellKey = (workerId: string, ymd: string) => `${workerId}:${ymd}`;

const byWorkerDate = computed(() => {
  const m = new Map<string, WorkerAvailabilityRow>();
  for (const row of availabilityStore.items) {
    m.set(cellKey(row.workerId, row.date), row);
  }
  return m;
});

const pendingCell = ref<string | null>(null);

async function loadWeek() {
  await workersStore.fetchList();
  const from = formatLocalYmd(weekStart.value);
  const to = formatLocalYmd(addDays(weekStart.value, 6));
  await Promise.all([
    availabilityStore.fetchRange({ from, to }),
    scheduleStore.fetchRange({ from, to }),
    jobsStore.fetchList(),
  ]);
  await Promise.all(
    jobsStore.list.map((j) => jobsStore.fetchScheduledWorkerIds(j.id)),
  );
}

const loadingWeek = computed(
  () =>
    workersStore.listLoading ||
    availabilityStore.loading ||
    scheduleStore.loading ||
    jobsStore.listLoading,
);

watch(
  weekStart,
  () => {
    void loadWeek();
  },
  { immediate: true },
);

function statusFor(workerId: string, ymd: string) {
  return byWorkerDate.value.get(cellKey(workerId, ymd))?.status;
}

async function onCellClick(workerId: string, ymd: string) {
  const key = cellKey(workerId, ymd);
  if (pendingCell.value) return;

  const existing = byWorkerDate.value.get(key);
  pendingCell.value = key;
  try {
    const cur = existing?.status;
    if (cur === undefined) {
      await availabilityStore.upsertDay({
        workerId,
        date: ymd,
        status: "AVAILABLE",
        notes: null,
      });
    } else if (cur === "AVAILABLE") {
      await availabilityStore.upsertDay({
        workerId,
        date: ymd,
        status: "UNAVAILABLE",
        notes: existing?.notes ?? null,
      });
    } else {
      if (existing) {
        await availabilityStore.remove(existing.id);
      }
    }
  } finally {
    pendingCell.value = null;
  }
}

function cellTitle(status: WorkerAvailabilityStatus | undefined): string {
  if (status === undefined) {
    return "Geen invoer — klik om beschikbaar te zetten";
  }
  if (status === "AVAILABLE") {
    return "Beschikbaar — klik voor niet beschikbaar";
  }
  return "Niet beschikbaar — klik om te wissen";
}

function cellShort(status: WorkerAvailabilityStatus | undefined): string {
  if (status === undefined) return "—";
  return status === "AVAILABLE" ? "B" : "N";
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">
          Week
        </h1>
        <p
          v-if="weekTab === 'availability'"
          class="text-sm text-zinc-600 dark:text-zinc-300"
        >
          Klik op een cel om te wisselen: leeg → beschikbaar → niet beschikbaar → leeg.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
          @click="prevWeek"
        >
          ← Vorige
        </button>
        <button
          type="button"
          class="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
          @click="thisWeek"
        >
          Deze week
        </button>
        <button
          type="button"
          class="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
          @click="nextWeek"
        >
          Volgende →
        </button>
      </div>
    </div>

    <p class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {{ rangeLabel }}
    </p>

    <div class="flex flex-wrap gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
      <button
        type="button"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          weekTab === 'availability'
            ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
        "
        @click="weekTab = 'availability'"
      >
        Beschikbaar
      </button>
      <button
        type="button"
        class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        :class="
          weekTab === 'planner'
            ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
        "
        @click="weekTab = 'planner'"
      >
        Rooster per project
      </button>
    </div>

    <p
      v-if="loadingWeek"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>
    <p
      v-else-if="weekTab === 'availability' && availabilityStore.error"
      class="text-sm text-red-400"
    >
      {{ availabilityStore.error }}
    </p>
    <p
      v-else-if="weekTab === 'planner' && (scheduleStore.error || jobsStore.listError)"
      class="text-sm text-red-400"
    >
      {{ scheduleStore.error || jobsStore.listError }}
    </p>

    <WeekPlannerPanel
      v-else-if="weekTab === 'planner'"
      :week-days="weekDays"
    />

    <div
      v-else-if="weekTab === 'availability' && workersStore.list.length === 0"
      class="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"
    >
      Nog geen teamleden.
      <RouterLink
        :to="{ name: 'project-team-pick', params: { projectId } }"
        class="finbar-link"
      >
        Toevoegen uit netwerk
      </RouterLink>
      om beschikbaarheid te plannen.
    </div>

    <div
      v-else-if="weekTab === 'availability'"
      class="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
    >
      <table class="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/80">
            <th
              class="sticky left-0 z-10 border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-left font-medium text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-300"
            >
              Teamlid
            </th>
            <th
              v-for="d in weekDays"
              :key="d.ymd"
              class="px-2 py-2 text-center font-medium text-zinc-600 dark:text-zinc-400"
            >
              {{ d.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="w in workersStore.list"
            :key="w.id"
            class="border-b border-zinc-200/80 dark:border-zinc-800/80"
          >
            <td
              class="sticky left-0 z-10 border-r border-zinc-200 bg-zinc-50 px-3 py-2 font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            >
              <RouterLink
                :to="{
                  name: 'project-worker-detail',
                  params: { projectId, id: w.id },
                }"
                class="text-zinc-900 hover:underline dark:text-zinc-100 dark:hover:text-white"
              >
                {{ w.name }}
              </RouterLink>
            </td>
            <td
              v-for="d in weekDays"
              :key="d.ymd"
              class="p-1"
            >
              <button
                type="button"
                :disabled="pendingCell !== null"
                :title="cellTitle(statusFor(w.id, d.ymd))"
                class="h-10 w-full min-w-[2.5rem] rounded-md border text-xs font-medium transition-colors disabled:opacity-50"
                :class="{
                  'border-dashed border-zinc-300 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-500 dark:hover:bg-zinc-800':
                    statusFor(w.id, d.ymd) === undefined,
                  'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800':
                    statusFor(w.id, d.ymd) === 'AVAILABLE',
                  'border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-500 dark:hover:bg-zinc-900':
                    statusFor(w.id, d.ymd) === 'UNAVAILABLE',
                }"
                @click="onCellClick(w.id, d.ymd)"
              >
                {{ cellShort(statusFor(w.id, d.ymd)) }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="weekTab === 'availability'"
      class="flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-500"
    >
      <span><span class="font-medium text-zinc-900 dark:text-zinc-300">B</span> = beschikbaar</span>
      <span><span class="text-zinc-700 dark:text-zinc-500">N</span> = niet beschikbaar</span>
      <span><span class="text-zinc-700 dark:text-zinc-500">—</span> = geen invoer</span>
    </div>
  </div>
</template>
