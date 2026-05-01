<script setup lang="ts">
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import FinbarDateField from "@/components/ui/FinbarDateField.vue";
import { inclusiveYmdRange } from "@/lib/localDate";
import { workerTradeSecondarySuffix } from "@/lib/workerTrades";
import type { TodayAvailabilityRow } from "@/stores/today";
import type { Worker } from "@/stores/workers";
import { useScheduleAssignmentsStore } from "@/stores/scheduleAssignments";
import { useWorkersStore } from "@/stores/workers";
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";

defineOptions({ name: "TodayAddWorkerPopover" });

const props = withDefaults(
  defineProps<{
    projectId: string;
    dateYmd: string;
    /** Wie al op het projectteam staat (minstens één inplanning). Alleen zij mogen per dag toegevoegd worden. */
    projectTeamWorkerIds: string[];
    existingWorkerIds: string[];
    /** Beschikbaarheid voor deze kalenderdag (uit /api/today). */
    availabilityToday?: TodayAvailabilityRow[];
    /** Gebruik met externe knoppen (b.v. in de kaart-header op brede schermen). */
    hideTrigger?: boolean;
  }>(),
  { hideTrigger: false, availabilityToday: () => [], projectTeamWorkerIds: () => [] },
);

const emit = defineEmits<{
  added: [];
}>();

const modalOpen = ref(false);
const workers = useWorkersStore();
const schedule = useScheduleAssignmentsStore();

const workerId = ref("");
const scheduleMultipleDays = ref(false);
const rangeFrom = ref(props.dateYmd);
const rangeTo = ref(props.dateYmd);
const pending = ref(false);
const formError = ref("");

const availabilityByWorkerId = computed(() => {
  const m = new Map<string, TodayAvailabilityRow>();
  for (const a of props.availabilityToday) {
    m.set(a.workerId, a);
  }
  return m;
});

const projectTeamIdSet = computed(
  () => new Set(props.projectTeamWorkerIds),
);

const notScheduledWorkers = computed(() =>
  workers.list.filter(
    (w) =>
      !props.existingWorkerIds.includes(w.id) &&
      projectTeamIdSet.value.has(w.id),
  ),
);

function workerLabel(w: Worker): string {
  return `${w.name}${workerTradeSecondarySuffix(w.trades)}`;
}

const workersAvailableToAdd = computed(() =>
  notScheduledWorkers.value
    .filter((w) => {
      const a = availabilityByWorkerId.value.get(w.id);
      return !a || a.status === "AVAILABLE";
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name)),
);

const workersUnavailableToAdd = computed(() =>
  notScheduledWorkers.value
    .filter((w) => availabilityByWorkerId.value.get(w.id)?.status === "UNAVAILABLE")
    .map((w) => {
      const a = availabilityByWorkerId.value.get(w.id)!;
      return {
        worker: w,
        reason: a.notes?.trim() || null,
      };
    })
    .slice()
    .sort((a, b) => a.worker.name.localeCompare(b.worker.name)),
);

watch(modalOpen, (v) => {
  if (!v) {
    formError.value = "";
    workerId.value = "";
    scheduleMultipleDays.value = false;
    resetRange();
  }
});

watch(
  () => props.dateYmd,
  () => {
    if (!modalOpen.value) resetRange();
  },
);

/** Tot / einddatum nooit vóór start: kalender begint op startdag. */
watch(rangeFrom, (from) => {
  if (from && rangeTo.value && rangeTo.value < from) {
    rangeTo.value = from;
  }
});

watch(workersAvailableToAdd, (list) => {
  const ok = list.some((w) => w.id === workerId.value);
  if (!ok) workerId.value = "";
});

function close() {
  modalOpen.value = false;
}

function resetRange() {
  rangeFrom.value = props.dateYmd;
  rangeTo.value = props.dateYmd;
}

function toggle() {
  formError.value = "";
  workerId.value = "";
  scheduleMultipleDays.value = false;
  resetRange();
  modalOpen.value = !modalOpen.value;
}

function open() {
  formError.value = "";
  workerId.value = "";
  scheduleMultipleDays.value = false;
  resetRange();
  modalOpen.value = true;
}

defineExpose({ open });

async function submit() {
  if (workersAvailableToAdd.value.length === 0) return;
  if (!workerId.value) {
    formError.value = "Kies een teamlid";
    return;
  }
  if (!workersAvailableToAdd.value.some((w) => w.id === workerId.value)) {
    formError.value = "Dit teamlid is op deze dag niet beschikbaar";
    return;
  }
  if (scheduleMultipleDays.value && (!rangeFrom.value || !rangeTo.value)) {
    formError.value = "Vul begindatum en einddatum in.";
    return;
  }
  if (scheduleMultipleDays.value && rangeFrom.value > rangeTo.value) {
    formError.value = "De begindatum moet op of vóór de einddatum liggen.";
    return;
  }
  const dates = scheduleMultipleDays.value
    ? inclusiveYmdRange(rangeFrom.value.trim(), rangeTo.value.trim())
    : [props.dateYmd];
  pending.value = true;
  formError.value = "";
  try {
    for (const date of dates) {
      await schedule.createAssignment({
        workerId: workerId.value,
        jobId: props.projectId,
        date,
      });
    }
    workerId.value = "";
    close();
    emit("added");
  } catch (e) {
    formError.value =
      e instanceof Error ? e.message : "Kon teamlid niet toevoegen";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div
    :class="
      hideTrigger
        ? 'contents'
        : 'inline-flex shrink-0 justify-start'
    "
  >
    <button
      v-if="!hideTrigger"
      type="button"
      class="inline-flex items-center gap-2 rounded-[calc(var(--finbar-radius-sm))] bg-white px-3 py-1.5 text-left text-xs font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      :aria-expanded="modalOpen"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <svg
        class="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Teamlid inplannen
    </button>

    <TodayModalShell v-model="modalOpen">
      <h2 class="finbar-modal-title mb-4">
        Teamlid inplannen
      </h2>
      <p
        v-if="workers.list.length === 0"
        class="text-sm text-zinc-600 dark:text-zinc-400"
      >
        Nog geen teamleden.
        <RouterLink
          :to="{ name: 'project-team-pick', params: { projectId: props.projectId } }"
          class="finbar-link font-medium"
          @click="close"
        >
          Toevoegen uit netwerk
        </RouterLink>
      </p>

      <p
        v-else-if="projectTeamWorkerIds.length === 0"
        class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
      >
        Voeg
        <RouterLink
          :to="{ name: 'project-team-pick', params: { projectId: props.projectId } }"
          class="finbar-link font-medium"
          @click="close"
        >
          team leden
        </RouterLink>
        toe aan dit project, om ze hier te kunnen inplannen.
      </p>

      <p
        v-else-if="notScheduledWorkers.length === 0"
        class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
      >
        Alle projectteamleden staan al ingepland op deze dag, of geen
        passende keuze meer.
      </p>

      <form
        v-else
        class="space-y-4"
        @submit.prevent="submit"
      >
        <div class="space-y-3">
          <div v-if="workersAvailableToAdd.length > 0">
            <label
              class="finbar-field-label"
              :for="`crew-worker-${dateYmd}`"
            >Teamlid</label>
            <select
              :id="`crew-worker-${dateYmd}`"
              v-model="workerId"
              required
              class="finbar-field-input"
            >
              <option
                disabled
                value=""
              >
                Kies…
              </option>
              <option
                v-for="w in workersAvailableToAdd"
                :key="w.id"
                :value="w.id"
              >
                {{ workerLabel(w) }}
              </option>
            </select>
          </div>
          <p
            v-else
            class="text-sm text-zinc-600 dark:text-zinc-400"
          >
            Op deze dag is niemand meer beschikbaar om in te plannen.
          </p>

          <template v-if="workersUnavailableToAdd.length > 0">
            <div
              class="border-t border-zinc-200 pt-3 dark:border-zinc-700"
              role="separator"
            />
            <p
              class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
            >
              Niet beschikbaar op deze dag
            </p>
            <ul
              class="max-h-40 space-y-1.5 overflow-y-auto text-sm text-zinc-700 dark:text-zinc-300"
            >
              <li
                v-for="item in workersUnavailableToAdd"
                :key="item.worker.id"
                class="leading-snug"
              >
                <span class="font-medium text-zinc-900 dark:text-zinc-100">{{
                  workerLabel(item.worker)
                }}</span>
                <span
                  v-if="item.reason"
                  class="text-zinc-500 dark:text-zinc-400"
                >
                  — {{ item.reason }}
                </span>
              </li>
            </ul>
          </template>
        </div>
        <div
          class="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
        >
          <label
            class="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
          >
            <input
              v-model="scheduleMultipleDays"
              type="checkbox"
              class="shrink-0 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
            >
            <span>Voor meerdere dagen inplannen</span>
          </label>
          <div
            v-if="scheduleMultipleDays"
            class="grid gap-3 sm:grid-cols-2"
          >
            <div>
              <label
                class="finbar-field-label"
                :for="`crew-range-from-${dateYmd}`"
              >Van</label>
              <FinbarDateField
                :id="`crew-range-from-${dateYmd}`"
                v-model="rangeFrom"
                class="w-full"
              />
            </div>
            <div>
              <label
                class="finbar-field-label"
                :for="`crew-range-to-${dateYmd}`"
              >Tot</label>
              <FinbarDateField
                :id="`crew-range-to-${dateYmd}`"
                v-model="rangeTo"
                class="w-full"
                :min="rangeFrom || undefined"
              />
            </div>
          </div>
        </div>
        <p
          v-if="formError"
          class="text-sm text-red-400"
        >
          {{ formError }}
        </p>
        <div class="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button
            type="submit"
            class="finbar-btn-primary-sm"
            :disabled="pending || workersAvailableToAdd.length === 0"
          >
            {{ pending ? "Bezig…" : "Inplannen" }}
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            :disabled="pending"
            @click="close"
          >
            Annuleren
          </button>
        </div>
      </form>
    </TodayModalShell>
  </div>
</template>
