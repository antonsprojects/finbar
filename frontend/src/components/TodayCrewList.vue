<script setup lang="ts">
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import type { TodayAvailabilityRow, TodayCrewRow } from "@/stores/today";
import { useScheduleAssignmentsStore } from "@/stores/scheduleAssignments";
import { computed, ref, watch } from "vue";

defineOptions({ name: "TodayCrewList" });

const props = withDefaults(
  defineProps<{
    crew: TodayCrewRow[];
    /** `chips`: compacte tags met statusstip (dagweergave). */
    layout?: "list" | "chips";
    /** Voor stipkleur in chip-layout (beschikbaar vs niet). */
    availabilityToday?: TodayAvailabilityRow[];
  }>(),
  { layout: "list", availabilityToday: () => [] },
);

const emit = defineEmits<{
  notesUpdated: [];
}>();

const schedule = useScheduleAssignmentsStore();

const modalOpen = ref(false);
const editing = ref<TodayCrewRow | null>(null);
const draftNotes = ref("");
const saveError = ref("");
const pending = ref(false);
const deletePending = ref(false);

function close() {
  modalOpen.value = false;
}

function openRowForEdit(row: TodayCrewRow) {
  editing.value = row;
  draftNotes.value = row.notes ?? "";
  saveError.value = "";
  modalOpen.value = true;
}

function onRowClick(_ev: MouseEvent, row: TodayCrewRow) {
  openRowForEdit(row);
}

function onRowKey(_ev: KeyboardEvent, row: TodayCrewRow) {
  openRowForEdit(row);
}

const panelTitle = computed(() =>
  editing.value ? `Teamlid — ${editing.value.workerName}` : "",
);

function availabilityFor(workerId: string): TodayAvailabilityRow | undefined {
  return props.availabilityToday.find((a) => a.workerId === workerId);
}

/** Stip: groen = beschikbaar (of geen agenda-record); amber = niet beschikbaar. */
function chipStatusDotClass(workerId: string): string {
  const a = availabilityFor(workerId);
  if (!a || a.status === "AVAILABLE") {
    return "bg-emerald-500 dark:bg-emerald-400";
  }
  return "bg-amber-500 dark:bg-amber-400";
}

function chipStatusTitle(workerId: string): string {
  const a = availabilityFor(workerId);
  if (!a) return "Ingepland op deze dag";
  if (a.status === "AVAILABLE") {
    return "Beschikbaar volgens agenda";
  }
  const n = a.notes?.trim();
  return n
    ? `Niet beschikbaar volgens agenda: ${n}`
    : "Niet beschikbaar volgens agenda";
}

function chipButtonTitle(c: TodayCrewRow): string | undefined {
  const parts = [chipStatusTitle(c.workerId), c.notes?.trim()].filter(Boolean);
  return parts.length ? parts.join(" — ") : undefined;
}

function chipButtonAriaLabel(c: TodayCrewRow): string {
  const t = chipButtonTitle(c);
  return t ? `${c.workerName}. ${t}` : `${c.workerName}, teamlid`;
}

watch(modalOpen, (v) => {
  if (!v) {
    editing.value = null;
    draftNotes.value = "";
    saveError.value = "";
  }
});

async function save() {
  if (!editing.value) return;
  pending.value = true;
  saveError.value = "";
  try {
    await schedule.updateNotes(
      editing.value.assignmentId,
      draftNotes.value.trim() || null,
    );
    close();
    emit("notesUpdated");
  } catch (e) {
    saveError.value =
      e instanceof Error ? e.message : "Kon notitie niet opslaan";
  } finally {
    pending.value = false;
  }
}

async function removeFromDay() {
  if (!editing.value) return;
  deletePending.value = true;
  saveError.value = "";
  try {
    await schedule.remove(editing.value.assignmentId);
    close();
    emit("notesUpdated");
  } catch (e) {
    saveError.value =
      e instanceof Error ? e.message : "Kon inplanning niet verwijderen";
  } finally {
    deletePending.value = false;
  }
}
</script>

<template>
  <ul
    v-if="props.layout === 'chips'"
    class="flex flex-wrap gap-2"
  >
    <li
      v-for="c in crew"
      :key="c.assignmentId"
    >
      <button
        type="button"
        class="inline-flex max-w-full min-w-0 items-center gap-2 rounded-[var(--finbar-radius-sm)] border border-zinc-300 bg-white px-3 py-1.5 text-left text-sm text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-700/80 dark:focus-visible:ring-zinc-500/40"
        :title="chipButtonTitle(c)"
        :aria-label="chipButtonAriaLabel(c)"
        @click="onRowClick($event, c)"
      >
        <span
          class="h-2 w-2 shrink-0 rounded-full"
          :class="chipStatusDotClass(c.workerId)"
          aria-hidden="true"
        />
        <span class="min-w-0 truncate font-medium">{{ c.workerName }}</span>
        <span
          v-if="c.notes?.trim()"
          class="inline-flex shrink-0 text-zinc-500 dark:text-zinc-400"
          aria-hidden="true"
        >
          <svg
            class="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
        </span>
      </button>
    </li>
  </ul>

  <ul
    v-else
    class="finbar-list-shell text-sm"
  >
    <li
      v-for="c in crew"
      :key="c.assignmentId"
    >
      <div
        role="button"
        tabindex="0"
        class="finbar-list-row cursor-pointer text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400/40 dark:text-zinc-100 dark:focus-visible:ring-zinc-500/40"
        @click="onRowClick($event, c)"
        @keydown.enter.prevent="onRowKey($event, c)"
        @keydown.space.prevent="onRowKey($event, c)"
      >
        <span class="min-w-0 shrink font-medium">{{ c.workerName }}</span>
        <p
          v-if="c.notes?.trim()"
          class="min-w-0 max-w-[55%] text-right text-xs text-zinc-600 dark:text-zinc-500 sm:max-w-[60%]"
          :title="c.notes?.trim() || undefined"
        >
          <span class="line-clamp-2 break-words">{{ c.notes.trim() }}</span>
        </p>
      </div>
    </li>
  </ul>

  <TodayModalShell v-model="modalOpen">
    <p
      v-if="editing"
      class="finbar-modal-title mb-4"
    >
      {{ panelTitle }}
    </p>
    <form
      class="space-y-4"
      @submit.prevent="save"
    >
      <div>
        <label
          class="finbar-field-label"
          for="crew-edit-notes"
        >Notities (optioneel)</label>
        <textarea
          id="crew-edit-notes"
          v-model="draftNotes"
          rows="5"
          maxlength="10000"
          class="finbar-field-input"
          placeholder="Optioneel"
        />
      </div>
      <p
        v-if="saveError"
        class="text-sm text-red-400"
      >
        {{ saveError }}
      </p>
      <div
        class="flex flex-wrap items-end justify-between gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800"
      >
        <div class="flex flex-wrap gap-2">
          <button
            type="submit"
            class="finbar-btn-primary-sm"
            :disabled="pending || deletePending"
          >
            {{ pending ? "Opslaan…" : "Opslaan" }}
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            :disabled="pending || deletePending"
            @click="close"
          >
            Annuleren
          </button>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/80 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
          :disabled="pending || deletePending"
          @click="removeFromDay"
        >
          {{ deletePending ? "Bezig…" : "Niet inplannen op deze dag" }}
        </button>
      </div>
    </form>
  </TodayModalShell>
</template>
