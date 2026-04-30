<script setup lang="ts">
import { isoWeekNumberForLocalDate } from "@/lib/localDate";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    /** First day of the visible month */
    monthAnchor: Date;
    selectedYmd?: string | null;
    todayYmd?: string | null;
    minYmd?: string | null;
    maxYmd?: string | null;
  }>(),
  {
    selectedYmd: null,
    todayYmd: null,
    minYmd: null,
    maxYmd: null,
  },
);

const emit = defineEmits<{
  "update:monthAnchor": [Date];
  pick: [ymd: string];
}>();

const dayHeaders = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] as const;

const calMonthTitle = computed(() =>
  new Intl.DateTimeFormat("nl-NL", {
    month: "long",
    year: "numeric",
  }).format(props.monthAnchor),
);

const rows = computed(() => {
  const y = props.monthAnchor.getFullYear();
  const m = props.monthAnchor.getMonth();
  const first = new Date(y, m, 1);
  const dow = first.getDay();
  const lead = dow === 0 ? 6 : dow - 1;
  const daysInM = new Date(y, m + 1, 0).getDate();

  /** Monday of calendar row 0 */
  const mondayRow0 = new Date(y, m, 1 + -lead);

  type Cell =
    | { kind: "blank"; key: string }
    | { kind: "day"; d: number; ymd: string };

  const flat: Cell[] = [];
  for (let i = 0; i < lead; i++) {
    flat.push({ kind: "blank", key: `b${i}` });
  }
  for (let d = 1; d <= daysInM; d++) {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    flat.push({ kind: "day", d, ymd: `${y}-${mm}-${dd}` });
  }
  while (flat.length % 7) {
    flat.push({ kind: "blank", key: `t${flat.length}` });
  }

  const out: { week: number; cells: Cell[] }[] = [];
  for (let r = 0; r < flat.length / 7; r++) {
    const mondayForRow = new Date(mondayRow0);
    mondayForRow.setDate(mondayRow0.getDate() + r * 7);
    const week = isoWeekNumberForLocalDate(mondayForRow);
    out.push({
      week,
      cells: flat.slice(r * 7, r * 7 + 7),
    });
  }
  return out;
});

function prevMonth() {
  const d = props.monthAnchor;
  emit(
    "update:monthAnchor",
    new Date(d.getFullYear(), d.getMonth() - 1, 1),
  );
}

function nextMonth() {
  const d = props.monthAnchor;
  emit(
    "update:monthAnchor",
    new Date(d.getFullYear(), d.getMonth() + 1, 1),
  );
}

function dateDisabled(ymd: string): boolean {
  if (props.minYmd && ymd < props.minYmd) return true;
  if (props.maxYmd && ymd > props.maxYmd) return true;
  return false;
}

function onPick(cell: Extract<(typeof rows.value)[0]["cells"][0], { kind: "day" }>) {
  if (dateDisabled(cell.ymd)) return;
  emit("pick", cell.ymd);
}
</script>

<template>
  <div class="min-w-0">
    <div class="mb-2 flex items-center justify-between">
      <button
        type="button"
        class="rounded px-2 py-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        aria-label="Vorige maand"
        @click="prevMonth"
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
        @click="nextMonth"
      >
        ›
      </button>
    </div>

    <!-- Los van day-grid gaps: één doorlopende ISO-weekstreep (`rounded` = zelfde als gekozen dag). -->
    <div class="flex min-w-0 items-stretch gap-x-1 max-md:gap-x-px">
      <div
        class="grid min-w-0 flex-1 grid-cols-7 gap-x-0.5 gap-y-0.5 max-md:gap-x-px max-md:gap-y-px"
      >
        <span
          v-for="h in dayHeaders"
          :key="h"
          class="flex min-h-[2.25rem] max-md:min-h-8 items-center justify-center py-1 text-center text-[0.6875rem] font-semibold tabular-nums leading-none text-zinc-400 max-md:text-[0.625rem] dark:text-zinc-500"
        >{{ h }}</span>

        <template
          v-for="(row, ri) in rows"
          :key="ri"
        >
          <template
            v-for="cell in row.cells"
            :key="cell.kind === 'day' ? cell.ymd : cell.key"
          >
            <span
              v-if="cell.kind === 'blank'"
              class="max-md:min-h-8 max-md:min-w-0 min-h-9 min-w-0 text-center tabular-nums"
              aria-hidden="true"
            />
            <button
              v-else
              type="button"
              class="max-md:min-h-8 flex min-h-9 min-w-0 w-full cursor-pointer items-center justify-center rounded py-1 text-center text-sm font-normal tabular-nums max-md:text-xs disabled:cursor-not-allowed disabled:opacity-35"
              :disabled="dateDisabled(cell.ymd)"
              :class="[
                cell.ymd === selectedYmd
                  ? 'bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : cell.ymd === todayYmd
                    ? 'border border-zinc-400 text-zinc-800 dark:border-zinc-500 dark:text-zinc-100'
                    : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800',
              ]"
              @click="onPick(cell)"
            >
              {{ cell.d }}
            </button>
          </template>
        </template>
      </div>

      <div
        class="flex min-w-[1.625rem] max-w-[1.75rem] shrink-0 flex-col overflow-hidden rounded bg-zinc-900 text-[0.65rem] font-medium tabular-nums text-white dark:bg-zinc-950 max-md:min-w-6 max-md:text-[0.625rem]"
      >
        <div
          class="flex min-h-[2.25rem] max-md:min-h-8 shrink-0 items-center justify-center font-bold leading-none"
        >
          w
        </div>
        <div
          v-for="(row, ri) in rows"
          :key="ri"
          class="flex min-h-9 flex-1 max-md:min-h-8 items-center justify-center"
        >
          {{ row.week }}
        </div>
      </div>
    </div>
  </div>
</template>
