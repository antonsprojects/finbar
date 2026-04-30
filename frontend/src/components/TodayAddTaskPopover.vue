<script setup lang="ts">
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import FinbarDateField from "@/components/ui/FinbarDateField.vue";
import { fetchBegroting, type BudgetPhaseDto, type BudgetTodoDto } from "@/lib/budgetApi";
import { inclusiveYmdRange } from "@/lib/localDate";
import type { TodayAvailabilityRow, TodayTask } from "@/stores/today";
import { useTasksStore } from "@/stores/tasks";
import { useWorkersStore } from "@/stores/workers";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink } from "vue-router";

/** taken.title max 200 in API; begrotingsregel kan langer zijn */
function titleForTaskFromBudget(s: string): string {
  return s.trim().length <= 200 ? s.trim() : s.trim().slice(0, 200);
}

defineOptions({ name: "TodayAddTaskPopover" });

const props = withDefaults(
  defineProps<{
    projectId: string;
    dateYmd: string;
    /** Wie op het projectteam staat; alleen zij als toegewezenen. */
    projectTeamWorkerIds: string[];
    /** Begrotingsregel-id’s die al een taak hebben op deze dag (geen duplicaat). */
    usedBudgetLineIds?: string[];
    /** Beschikbaarheid voor deze dag (uit /api/today, zelfde als team inplannen). */
    availabilityToday?: TodayAvailabilityRow[];
    /** Gebruik met externe knoppen (b.v. in de kaart-header op brede schermen). */
    hideTrigger?: boolean;
  }>(),
  {
    hideTrigger: false,
    projectTeamWorkerIds: () => [],
    usedBudgetLineIds: () => [],
    availabilityToday: () => [],
  },
);

const emit = defineEmits<{
  created: [];
}>();

const modalOpen = ref(false);
const tasks = useTasksStore();
const workers = useWorkersStore();

const mode = ref<"create" | "edit">("create");
const editingTaskId = ref<string | null>(null);

const title = ref("");
const assignedWorkerIds = ref<string[]>([]);
const scheduleMultipleDays = ref(false);
const rangeFrom = ref(props.dateYmd);
const rangeTo = ref(props.dateYmd);
const pending = ref(false);
const deletePending = ref(false);
const formError = ref("");

const budgetPhases = ref<BudgetPhaseDto[]>([]);
const budgetLoading = ref(false);
const budgetLoadError = ref("");
const budgetSearch = ref("");
const selectedBudgetLineId = ref<string | null>(null);
/** Dropdownpanel onder het zoekveld (combobox). */
const budgetPickerOpen = ref(false);
const budgetSearchInputRef = ref<HTMLInputElement | null>(null);
const budgetListPosition = ref<Record<string, string | number>>({});
let budgetPositionListeners = false;

const projectTeamIdSet = computed(
  () => new Set(props.projectTeamWorkerIds),
);

const usedLineIdSet = computed(
  () => new Set(props.usedBudgetLineIds.filter(Boolean)),
);

function isBudgetLineAlreadyOnDay(budgetLineId: string) {
  return usedLineIdSet.value.has(budgetLineId);
}

const availabilityByWorkerId = computed(() => {
  const m = new Map<string, TodayAvailabilityRow>();
  for (const a of props.availabilityToday) {
    m.set(a.workerId, a);
  }
  return m;
});

/** Teamlid op taken; niet-beschikbaren (deze dag) weg, behalve in bewerken als al toegewezen. */
const assigneeCheckboxWorkers = computed(() => {
  const selected = new Set(assignedWorkerIds.value);
  return workers.list.filter((w) => {
    const onTeam = projectTeamIdSet.value.has(w.id) || selected.has(w.id);
    if (!onTeam) return false;

    const a = availabilityByWorkerId.value.get(w.id);
    if (a?.status === "UNAVAILABLE") {
      return mode.value === "edit" && selected.has(w.id);
    }
    return true;
  });
});

/** Namen: niet in de vinklijst, wél op het team en afwezig (informatie onder de box). */
const unavailableProjectTeamNames = computed(() => {
  const names: string[] = [];
  for (const w of workers.list) {
    if (!projectTeamIdSet.value.has(w.id)) continue;
    if (availabilityByWorkerId.value.get(w.id)?.status !== "UNAVAILABLE") {
      continue;
    }
    if (mode.value === "edit" && assignedWorkerIds.value.includes(w.id)) {
      continue;
    }
    names.push(w.name);
  }
  return names.sort((a, b) =>
    a.localeCompare(b, "nl", { sensitivity: "base" }),
  );
});

const unavailableDaySummary = computed(() => {
  const n = unavailableProjectTeamNames.value;
  if (n.length === 0) return "";
  if (n.length === 1) {
    return `${n[0]} is niet beschikbaar deze dag.`;
  }
  if (n.length === 2) {
    return `${n[0]} en ${n[1]} zijn niet beschikbaar deze dag.`;
  }
  const last = n[n.length - 1]!;
  return `${n.slice(0, -1).join(", ")} en ${last} zijn niet beschikbaar deze dag.`;
});

const panelHeading = computed(() =>
  mode.value === "edit" ? "Taak bewerken" : "Taak toevoegen",
);

const hasBudgetLines = computed(() =>
  budgetPhases.value.some((p) => p.todos.length > 0),
);

/** Fases + taken, gefilterd op zoekterm (titel of fasenaam). */
const phasesForPicker = computed(() => {
  const q = budgetSearch.value.trim().toLowerCase();
  return budgetPhases.value
    .map((p) => {
      const todos = [...p.todos]
        .sort(
          (a, b) =>
            a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
        )
        .filter((t) => {
          if (!q) return true;
          return (
            t.title.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q)
          );
        });
      return { ...p, todos };
    })
    .filter((p) => p.todos.length > 0);
});

const selectedPhaseName = computed(() => {
  const lineId = selectedBudgetLineId.value;
  if (!lineId) return "";
  for (const p of budgetPhases.value) {
    if (p.todos.some((t) => t.id === lineId)) return p.name;
  }
  return "";
});

async function loadBudget() {
  budgetLoadError.value = "";
  budgetLoading.value = true;
  try {
    budgetPhases.value = await fetchBegroting(props.projectId);
  } catch (e) {
    budgetPhases.value = [];
    budgetLoadError.value =
      e instanceof Error
        ? e.message
        : "Kon begroting niet laden";
  } finally {
    budgetLoading.value = false;
    void nextTick(() => {
      if (
        budgetPhases.value.some((p) => p.todos.length > 0) &&
        !selectedBudgetLineId.value
      ) {
        budgetPickerOpen.value = true;
      }
    });
  }
}

function selectBudgetTodo(_phase: BudgetPhaseDto, todo: BudgetTodoDto) {
  if (isBudgetLineAlreadyOnDay(todo.id)) return;
  selectedBudgetLineId.value = todo.id;
  title.value = titleForTaskFromBudget(todo.title);
  formError.value = "";
  budgetPickerOpen.value = false;
  budgetSearch.value = "";
}

function clearBudgetSelection() {
  selectedBudgetLineId.value = null;
  title.value = "";
  budgetSearch.value = "";
  formError.value = "";
  void nextTick(() => {
    budgetPickerOpen.value = true;
    budgetSearchInputRef.value?.focus();
  });
}

let budgetBlurCloseTimer: ReturnType<typeof setTimeout> | null = null;
function onBudgetInputFocus() {
  if (budgetBlurCloseTimer) {
    clearTimeout(budgetBlurCloseTimer);
    budgetBlurCloseTimer = null;
  }
  budgetPickerOpen.value = true;
}
function onBudgetInputBlur() {
  budgetBlurCloseTimer = setTimeout(() => {
    budgetPickerOpen.value = false;
    budgetBlurCloseTimer = null;
  }, 150);
}

function updateBudgetListPosition() {
  const el = budgetSearchInputRef.value;
  if (!el || !budgetPickerOpen.value) {
    return;
  }
  const r = el.getBoundingClientRect();
  const left = Math.max(8, r.left);
  budgetListPosition.value = {
    position: "fixed",
    top: `${Math.round(r.bottom + 4)}px`,
    left: `${Math.round(left)}px`,
    width: `${Math.round(r.width)}px`,
    maxWidth: "calc(100vw - 16px)",
    zIndex: 250,
  };
}

function bindBudgetListPositionListeners() {
  if (budgetPositionListeners) return;
  budgetPositionListeners = true;
  window.addEventListener("scroll", updateBudgetListPosition, true);
  window.addEventListener("resize", updateBudgetListPosition);
}

function unbindBudgetListPositionListeners() {
  if (!budgetPositionListeners) return;
  budgetPositionListeners = false;
  window.removeEventListener("scroll", updateBudgetListPosition, true);
  window.removeEventListener("resize", updateBudgetListPosition);
}

watch(
  [budgetPickerOpen, selectedBudgetLineId],
  () => {
    void nextTick(() => {
      if (budgetPickerOpen.value && !selectedBudgetLineId.value) {
        updateBudgetListPosition();
        bindBudgetListPositionListeners();
      } else {
        unbindBudgetListPositionListeners();
      }
    });
  },
);

watch(budgetSearch, () => {
  void nextTick(updateBudgetListPosition);
});

onBeforeUnmount(() => {
  unbindBudgetListPositionListeners();
  if (budgetBlurCloseTimer) {
    clearTimeout(budgetBlurCloseTimer);
  }
});

watch(modalOpen, (v) => {
  if (!v) {
    formError.value = "";
    title.value = "";
    assignedWorkerIds.value = [];
    scheduleMultipleDays.value = false;
    resetRange();
    mode.value = "create";
    editingTaskId.value = null;
    budgetSearch.value = "";
    selectedBudgetLineId.value = null;
    budgetLoadError.value = "";
    budgetPickerOpen.value = false;
  } else if (mode.value === "create") {
    void loadBudget();
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

function close() {
  modalOpen.value = false;
}

function resetRange() {
  rangeFrom.value = props.dateYmd;
  rangeTo.value = props.dateYmd;
}

function toggle() {
  mode.value = "create";
  editingTaskId.value = null;
  title.value = "";
  assignedWorkerIds.value = [];
  scheduleMultipleDays.value = false;
  resetRange();
  formError.value = "";
  budgetSearch.value = "";
  selectedBudgetLineId.value = null;
  budgetPickerOpen.value = false;
  modalOpen.value = !modalOpen.value;
}

function openCreate() {
  mode.value = "create";
  editingTaskId.value = null;
  title.value = "";
  assignedWorkerIds.value = [];
  scheduleMultipleDays.value = false;
  resetRange();
  formError.value = "";
  budgetSearch.value = "";
  selectedBudgetLineId.value = null;
  budgetPickerOpen.value = false;
  modalOpen.value = true;
}

function openEditFromRow(task: TodayTask) {
  mode.value = "edit";
  editingTaskId.value = task.id;
  title.value = task.title;
  assignedWorkerIds.value = [...(task.assignedWorkerIds ?? [])];
  scheduleMultipleDays.value = false;
  resetRange();
  formError.value = "";
  modalOpen.value = true;
}

defineExpose({
  openCreate,
  openEditFromRow,
});

function toggleWorker(workerId: string, checked: boolean) {
  const cur = assignedWorkerIds.value;
  if (checked) {
    if (!cur.includes(workerId)) assignedWorkerIds.value = [...cur, workerId];
  } else {
    assignedWorkerIds.value = cur.filter((id) => id !== workerId);
  }
}

async function submit() {
  if (mode.value === "create") {
    if (!selectedBudgetLineId.value) {
      formError.value = "Kies een taak uit de begroting";
      return;
    }
  }
  const t = title.value.trim();
  if (!t) {
    formError.value =
      mode.value === "create"
        ? "Kies een taak uit de begroting"
        : "Vul een titel in";
    return;
  }
  if (
    mode.value === "create" &&
    selectedBudgetLineId.value &&
    isBudgetLineAlreadyOnDay(selectedBudgetLineId.value)
  ) {
    formError.value =
      "Deze taak is al op deze dag toegevoegd. Kies een andere regel.";
    return;
  }
  if (
    mode.value === "create" &&
    scheduleMultipleDays.value &&
    (!rangeFrom.value || !rangeTo.value)
  ) {
    formError.value = "Vul begindatum en einddatum in.";
    return;
  }
  if (
    mode.value === "create" &&
    scheduleMultipleDays.value &&
    rangeFrom.value > rangeTo.value
  ) {
    formError.value = "De begindatum moet op of vóór de einddatum liggen.";
    return;
  }
  const dates =
    mode.value === "create" && scheduleMultipleDays.value
      ? inclusiveYmdRange(rangeFrom.value.trim(), rangeTo.value.trim())
      : [props.dateYmd];
  pending.value = true;
  formError.value = "";
  try {
    if (mode.value === "edit" && editingTaskId.value) {
      await tasks.updateTask(editingTaskId.value, {
        title: t,
        assignedWorkerIds: [...assignedWorkerIds.value],
      });
    } else {
      for (const scheduledDate of dates) {
        await tasks.createTask({
          jobId: props.projectId,
          title: t,
          scheduledDate,
          assignedWorkerIds: [...assignedWorkerIds.value],
          budgetLineId: selectedBudgetLineId.value ?? undefined,
        });
      }
    }
    close();
    emit("created");
  } catch (e) {
    formError.value =
      e instanceof Error
        ? e.message
        : mode.value === "edit"
          ? "Kon taak niet bijwerken"
          : "Kon taak niet aanmaken";
  } finally {
    pending.value = false;
  }
}

async function removeTask() {
  if (!editingTaskId.value) return;
  deletePending.value = true;
  formError.value = "";
  try {
    await tasks.deleteTask(editingTaskId.value);
    close();
    emit("created");
  } catch (e) {
    formError.value =
      e instanceof Error ? e.message : "Kon taak niet verwijderen";
  } finally {
    deletePending.value = false;
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
      Taak toevoegen
    </button>

    <TodayModalShell v-model="modalOpen">
      <h2 class="finbar-modal-title mb-4">
        {{ panelHeading }}
      </h2>
      <form
        class="space-y-4"
        @submit.prevent="submit"
      >
        <div
          v-if="mode === 'create'"
          class="space-y-2"
        >
          <p class="finbar-field-label">
            Selecteer taak
          </p>
          <p
            v-if="budgetLoading"
            class="text-sm text-zinc-600 dark:text-zinc-300"
          >
            Begroting laden…
          </p>
          <p
            v-else-if="budgetLoadError"
            class="text-sm text-red-400"
          >
            {{ budgetLoadError }}
          </p>
          <div
            v-else-if="!hasBudgetLines"
            class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
          >
            Maak taken aan in de
            <RouterLink
              :to="{
                name: 'project-begroting',
                params: { projectId: props.projectId },
              }"
              class="finbar-link font-medium"
              @click="close"
            >
              begroting
            </RouterLink>
            om ze hier te kunnen inplannen.
          </div>
          <template
            v-else
          >
            <div
              v-if="selectedBudgetLineId"
              class="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50/90 p-3 dark:border-zinc-600 dark:bg-zinc-900/50"
            >
              <div
                class="min-w-0 flex-1"
              >
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                >
                  {{ selectedPhaseName }}
                </p>
                <p
                  class="mt-0.5 font-medium text-zinc-900 dark:text-zinc-100"
                >
                  {{ title }}
                </p>
              </div>
              <button
                type="button"
                class="shrink-0 text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
                @click="clearBudgetSelection"
              >
                Wijzigen
              </button>
            </div>
            <div
              v-else
              class="relative"
            >
              <label
                class="sr-only"
                :for="`task-budget-combo-${dateYmd}`"
              >Zoeken in begroting</label>
              <input
                :id="`task-budget-combo-${dateYmd}`"
                ref="budgetSearchInputRef"
                v-model="budgetSearch"
                type="search"
                autocomplete="off"
                class="finbar-field-input"
                role="combobox"
                :aria-expanded="budgetPickerOpen"
                aria-autocomplete="list"
                placeholder="Typ om te zoeken op fase of taak…"
                @focus="onBudgetInputFocus"
                @blur="onBudgetInputBlur"
                @input="onBudgetInputFocus"
                @keydown.escape.prevent="budgetPickerOpen = false"
              >
            </div>
            <Teleport to="body">
              <div
                v-show="
                  budgetPickerOpen &&
                    !selectedBudgetLineId &&
                    hasBudgetLines &&
                    !budgetLoading
                "
                :style="budgetListPosition"
                class="max-h-[min(16rem,45vh)] overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10"
                role="listbox"
                aria-label="Kies taak uit begroting"
              >
                <div
                  v-for="phase in phasesForPicker"
                  :key="phase.id"
                >
                  <h3
                    class="px-2.5 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                  >
                    {{ phase.name }}
                  </h3>
                  <ul>
                    <li
                      v-for="todo in phase.todos"
                      :key="todo.id"
                    >
                      <button
                        type="button"
                        class="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-sm text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:text-zinc-100 dark:hover:bg-zinc-800 dark:disabled:hover:bg-transparent"
                        role="option"
                        :aria-selected="selectedBudgetLineId === todo.id"
                        :aria-disabled="isBudgetLineAlreadyOnDay(todo.id)"
                        :disabled="isBudgetLineAlreadyOnDay(todo.id)"
                        @mousedown.prevent="selectBudgetTodo(phase, todo)"
                      >
                        <span class="min-w-0 break-words">{{
                          todo.title
                        }}</span>
                        <span
                          v-if="isBudgetLineAlreadyOnDay(todo.id)"
                          class="shrink-0 whitespace-nowrap text-xs font-medium text-zinc-500 dark:text-zinc-400"
                        >Toegevoegd</span>
                      </button>
                    </li>
                  </ul>
                </div>
                <p
                  v-if="phasesForPicker.length === 0"
                  class="px-2.5 py-3 text-sm text-zinc-500 dark:text-zinc-400"
                >
                  Geen resultaten. Pas je zoekterm aan.
                </p>
              </div>
            </Teleport>
            <p
              v-if="!selectedBudgetLineId"
              class="text-xs text-zinc-500 dark:text-zinc-400"
            >
              Kies de begrotingsregel die op deze dag gepland wordt.
            </p>
          </template>
        </div>
        <div v-else>
          <label
            class="finbar-field-label"
            :for="`task-title-${dateYmd}-edit`"
          >Titel</label>
          <input
            :id="`task-title-${dateYmd}-edit`"
            v-model="title"
            type="text"
            required
            maxlength="200"
            class="finbar-field-input"
            placeholder="Bijv. Materiaal bestellen"
          >
        </div>
        <div>
          <p class="finbar-field-label">
            Teamleden toevoegen aan taak (optioneel)
          </p>
          <div
            class="mt-1.5 max-h-48 space-y-2 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-950/50"
          >
            <p
              v-if="projectTeamWorkerIds.length === 0"
              class="text-sm text-zinc-500 dark:text-zinc-400"
            >
              Er is nog geen team voor dit project. Hier kan je
              <RouterLink
                :to="{ name: 'project-team-pick', params: { projectId: props.projectId } }"
                class="finbar-link font-medium"
                @click="close"
              >
                teamleden toevoegen
              </RouterLink>
              .
            </p>
            <p
              v-else-if="assigneeCheckboxWorkers.length === 0"
              class="text-sm text-zinc-500 dark:text-zinc-400"
            >
              Niemand van het projectteam is op deze dag beschikbaar om toe te
              wijzen.
            </p>
            <template v-else>
              <label
                v-for="w in assigneeCheckboxWorkers"
                :key="w.id"
                class="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
              >
                <input
                  type="checkbox"
                  class="shrink-0 rounded border-zinc-300 text-zinc-900 dark:border-zinc-600"
                  :checked="assignedWorkerIds.includes(w.id)"
                  @change="
                    toggleWorker(
                      w.id,
                      ($event.target as HTMLInputElement).checked,
                    )
                  "
                >
                <span>
                  {{ w.name }}{{ w.trade ? ` — ${w.trade}` : "" }}
                </span>
              </label>
            </template>
          </div>
          <p
            v-if="unavailableDaySummary"
            class="mt-2 text-xs text-amber-800 dark:text-amber-200/90"
          >
            {{ unavailableDaySummary }}
          </p>
        </div>
        <div
          v-if="mode === 'create'"
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
                :for="`task-range-from-${dateYmd}`"
              >Van</label>
              <FinbarDateField
                :id="`task-range-from-${dateYmd}`"
                v-model="rangeFrom"
                class="w-full"
              />
            </div>
            <div>
              <label
                class="finbar-field-label"
                :for="`task-range-to-${dateYmd}`"
              >Tot</label>
              <FinbarDateField
                :id="`task-range-to-${dateYmd}`"
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
        <div
          class="flex flex-col gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 dark:border-zinc-800"
        >
          <div
            class="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:gap-2"
          >
            <button
              type="submit"
              class="finbar-btn-primary-sm min-w-0 justify-center"
              :disabled="pending || deletePending"
            >
              {{
                pending
                  ? "Opslaan…"
                  : mode === "edit"
                    ? "Opslaan"
                    : "Taak toevoegen"
              }}
            </button>
            <button
              type="button"
              class="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 sm:border-0 sm:bg-transparent sm:px-3 sm:py-1.5 sm:text-zinc-600 sm:hover:bg-zinc-100 sm:dark:hover:bg-zinc-800"
              :disabled="pending || deletePending"
              @click="close"
            >
              Annuleren
            </button>
          </div>
          <button
            v-if="mode === 'edit'"
            type="button"
            class="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/80 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40 sm:w-auto sm:shrink-0 sm:py-1.5"
            :disabled="pending || deletePending"
            @click="removeTask"
          >
            {{ deletePending ? "Bezig…" : "Niet op deze dag" }}
          </button>
        </div>
      </form>
    </TodayModalShell>
  </div>
</template>
