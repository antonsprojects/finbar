<script setup lang="ts">
import type { ScheduleAssignmentRow } from "@/stores/scheduleAssignments";
import { useScheduleAssignmentsStore } from "@/stores/scheduleAssignments";
import { useJobsStore } from "@/stores/jobs";
import type { WorkerAvailabilityRow } from "@/stores/workerAvailability";
import { useWorkerAvailabilityStore } from "@/stores/workerAvailability";
import { useWorkersStore } from "@/stores/workers";
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

defineOptions({ name: "WeekPlannerPanel" });

const route = useRoute();
const projectId = computed(() => route.params.projectId as string);

const props = defineProps<{
  weekDays: { ymd: string; label: string }[];
}>();

const workersStore = useWorkersStore();
const jobsStore = useJobsStore();
const scheduleStore = useScheduleAssignmentsStore();
const availabilityStore = useWorkerAvailabilityStore();

const cellKey = (workerId: string, ymd: string) => `${workerId}:${ymd}`;

const availabilityByKey = computed(() => {
  const m = new Map<string, WorkerAvailabilityRow>();
  for (const row of availabilityStore.items) {
    m.set(cellKey(row.workerId, row.date), row);
  }
  return m;
});

const assignmentsByKey = computed(() => {
  const m = new Map<string, ScheduleAssignmentRow[]>();
  for (const a of scheduleStore.items) {
    const k = cellKey(a.workerId, a.date);
    const arr = m.get(k) ?? [];
    arr.push(a);
    m.set(k, arr);
  }
  for (const [, arr] of m) {
    arr.sort((x, y) => x.job.name.localeCompare(y.job.name, "nl"));
  }
  return m;
});

function assignmentsFor(workerId: string, ymd: string): ScheduleAssignmentRow[] {
  return assignmentsByKey.value.get(cellKey(workerId, ymd)) ?? [];
}

const modalOpen = ref(false);
const modalWorkerId = ref("");
const modalYmd = ref("");
const formJobId = ref("");
const formNotes = ref("");
const formError = ref("");
const pending = ref(false);

const modalWorkerName = computed(() => {
  const w = workersStore.list.find((x) => x.id === modalWorkerId.value);
  return w?.name ?? "";
});

const modalDateLabel = computed(() => {
  const d = props.weekDays.find((x) => x.ymd === modalYmd.value);
  return d?.label ?? modalYmd.value;
});

const modalAvailability = computed(() => {
  return availabilityByKey.value.get(
    cellKey(modalWorkerId.value, modalYmd.value),
  );
});

const modalAssignments = computed(() =>
  assignmentsFor(modalWorkerId.value, modalYmd.value),
);

/** Alleen projecten waar dit teamlid al op het projectteam staat. */
const jobsForAddDropdown = computed(() => {
  const wId = modalWorkerId.value;
  if (!wId) return jobsStore.list;
  return jobsStore.list.filter((j) =>
    (jobsStore.scheduledWorkerIdsByJobId[j.id] ?? []).includes(wId),
  );
});

function openModal(workerId: string, ymd: string) {
  modalWorkerId.value = workerId;
  modalYmd.value = ymd;
  formJobId.value = "";
  formNotes.value = "";
  formError.value = "";
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

async function submitAdd() {
  formError.value = "";
  if (!formJobId.value) {
    formError.value = "Kies een project";
    return;
  }
  if (!jobsForAddDropdown.value.some((j) => j.id === formJobId.value)) {
    formError.value =
      "Dit projectteam is niet geldig voor dit teamlid. Voeg iemand eerst toe via Team op dat project.";
    return;
  }
  pending.value = true;
  try {
    await scheduleStore.createAssignment({
      workerId: modalWorkerId.value,
      jobId: formJobId.value,
      date: modalYmd.value,
      notes: formNotes.value.trim() || null,
    });
    formJobId.value = "";
    formNotes.value = "";
  } catch (e) {
    formError.value =
      e instanceof Error ? e.message : "Kon planning niet toevoegen";
  } finally {
    pending.value = false;
  }
}

async function removeRow(id: string) {
  pending.value = true;
  formError.value = "";
  try {
    await scheduleStore.remove(id);
  } catch (e) {
    formError.value =
      e instanceof Error ? e.message : "Kon planning niet verwijderen";
  } finally {
    pending.value = false;
  }
}

watch(modalOpen, (open) => {
  if (typeof globalThis.document !== "undefined") {
    globalThis.document.body.style.overflow = open ? "hidden" : "";
  }
  if (open) {
    if (
      formJobId.value &&
      !jobsForAddDropdown.value.some((j) => j.id === formJobId.value)
    ) {
      formJobId.value = "";
    }
  }
});

watch([modalWorkerId, jobsForAddDropdown], () => {
  if (!modalOpen.value) return;
  if (
    formJobId.value &&
    !jobsForAddDropdown.value.some((j) => j.id === formJobId.value)
  ) {
    formJobId.value = "";
  }
});
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-zinc-600 dark:text-zinc-300">
      Wijs teamleden per dag toe aan projecten. Een teamlid kan dezelfde dag op meerdere projecten staan.
      Lege cellen zijn vrij — klik om toe te voegen.
    </p>

    <p
      v-if="workersStore.listLoading || jobsStore.listLoading || scheduleStore.loading"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>
    <p
      v-else-if="scheduleStore.error"
      class="text-sm text-red-400"
    >
      {{ scheduleStore.error }}
    </p>

    <div
      v-else-if="workersStore.list.length === 0"
      class="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"
    >
      Nog geen teamleden.
      <RouterLink
        :to="{ name: 'project-team-pick', params: { projectId } }"
        class="finbar-link"
      >
        Toevoegen uit netwerk
      </RouterLink>
    </div>

    <div
      v-else-if="jobsStore.list.length === 0"
      class="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"
    >
      Nog geen projecten.
      <RouterLink
        :to="{ name: 'project-new' }"
        class="finbar-link"
      >
        Maak een project
      </RouterLink>
    </div>

    <div
      v-else
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
              class="align-top p-1"
            >
              <button
                type="button"
                class="min-h-[2.75rem] w-full rounded-md border px-1 py-1 text-left text-xs transition-colors hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
                :class="{
                  'border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/30':
                    assignmentsFor(w.id, d.ymd).length === 0,
                  'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900/60':
                    assignmentsFor(w.id, d.ymd).length > 0,
                }"
                @click="openModal(w.id, d.ymd)"
              >
                <ul
                  v-if="assignmentsFor(w.id, d.ymd).length > 0"
                  class="space-y-0.5"
                >
                  <li
                    v-for="a in assignmentsFor(w.id, d.ymd)"
                    :key="a.id"
                    class="truncate text-zinc-800 dark:text-zinc-300"
                  >
                    {{ a.job.name }}
                  </li>
                </ul>
                <span
                  v-else
                  class="block py-2 text-center text-zinc-600 dark:text-zinc-500"
                >—</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="text-xs text-zinc-600 dark:text-zinc-500">
      <p>
        <span class="font-medium text-zinc-800 dark:text-zinc-400">Tip:</span>
        vergelijk met het tabblad Beschikbaar — iemand die als niet beschikbaar staat toch inplannen mag (overschrijving), maar let op de waarschuwing in het venster.
      </p>
    </div>

    <Teleport to="body">
      <div
        v-if="modalOpen"
        class="fixed inset-0 z-50 flex max-sm:items-stretch max-sm:justify-stretch max-sm:p-0 sm:items-center sm:justify-center sm:bg-black/60 sm:p-4"
        role="dialog"
        aria-modal="true"
        @click.self="closeModal"
      >
        <div
          class="absolute inset-0 bg-black/60 sm:hidden"
          aria-hidden="true"
          @click="closeModal"
        ></div>
        <div
          class="relative z-10 flex h-full w-full min-h-0 max-w-md flex-col overflow-hidden border-zinc-200 bg-white sm:max-h-[min(90vh,40rem)] sm:rounded-lg sm:border sm:shadow-xl dark:border-zinc-700 dark:bg-zinc-900 max-sm:max-h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0"
          @click.stop
        >
          <button
            type="button"
            class="absolute right-2 top-2 z-20 rounded-md p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 sm:right-3 sm:top-3 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Sluiten"
            @click="closeModal"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div class="shrink-0 border-b border-zinc-200 px-4 py-3 pr-14 dark:border-zinc-800">
            <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">
              Inplanning
            </h2>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              {{ modalWorkerName }} · {{ modalDateLabel }}
            </p>
          </div>
          <div
            class="min-h-0 flex-1 overflow-y-auto p-4"
          >

          <div
            v-if="modalAvailability?.status === 'UNAVAILABLE'"
            class="mb-3 rounded-[var(--finbar-radius)] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300"
          >
            Voor deze dag is de beschikbaarheid <strong>niet beschikbaar</strong>
            <span v-if="modalAvailability.notes"> ({{ modalAvailability.notes }})</span>.
          </div>

          <div
            v-else-if="modalAvailability?.status === 'AVAILABLE'"
            class="mb-3 rounded-[var(--finbar-radius)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300"
          >
            Beschikbaar: beschikbaar
          </div>

          <div
            v-else
            class="mb-3 rounded-md border border-zinc-200 bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-500"
          >
            Geen beschikbaarheidsinvoer voor deze dag (zie tabblad Beschikbaar).
          </div>

          <ul
            v-if="modalAssignments.length > 0"
            class="mb-4 space-y-2"
          >
            <li
              v-for="a in modalAssignments"
              :key="a.id"
              class="flex items-start justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/50"
            >
              <div class="min-w-0 flex-1">
                <RouterLink
                  :to="{
                    name: 'project-job',
                    params: { projectId: a.jobId },
                  }"
                  class="font-medium finbar-link"
                >
                  {{ a.job.name }}
                </RouterLink>
                <p
                  v-if="a.notes"
                  class="mt-0.5 text-xs text-zinc-500"
                >
                  {{ a.notes }}
                </p>
              </div>
              <button
                type="button"
                :disabled="pending"
                class="shrink-0 rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                @click="removeRow(a.id)"
              >
                Verwijderen
              </button>
            </li>
          </ul>
          <p
            v-else
            class="mb-4 text-sm text-zinc-600 dark:text-zinc-500"
          >
            No assignments yet for this day.
          </p>

          <form
            class="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
            @submit.prevent="submitAdd"
          >
            <h3 class="text-sm font-medium text-zinc-800 dark:text-zinc-300">
              Inplanning toevoegen
            </h3>
            <div>
              <label
                class="mb-1 block text-xs text-zinc-600 dark:text-zinc-500"
                for="planner-job"
              >Project</label>
              <p
                v-if="jobsForAddDropdown.length === 0"
                class="text-sm text-zinc-600 dark:text-zinc-400"
              >
                Nergens op een projectteam. Voeg
                <RouterLink
                  :to="{
                    name: 'project-team-pick',
                    params: { projectId },
                  }"
                  class="finbar-link"
                >
                  iemand op een project
                </RouterLink>
                toe, daarna kun je ze hier verder inplannen.
              </p>
              <select
                v-else
                id="planner-job"
                v-model="formJobId"
                class="finbar-field-input text-sm"
              >
                <option value="">
                  Kies project…
                </option>
                <option
                  v-for="j in jobsForAddDropdown"
                  :key="j.id"
                  :value="j.id"
                >
                  {{ j.name }}
                </option>
              </select>
            </div>
            <div>
              <label
                class="mb-1 block text-xs text-zinc-600 dark:text-zinc-500"
                for="planner-notes"
              >Notities (optioneel)</label>
              <textarea
                id="planner-notes"
                v-model="formNotes"
                rows="2"
                maxlength="10000"
                class="finbar-field-input text-sm"
                placeholder="bijv. halve dag"
              />
            </div>
            <p
              v-if="formError"
              class="text-sm text-red-400"
            >
              {{ formError }}
            </p>
            <button
              type="submit"
              :disabled="pending || jobsForAddDropdown.length === 0"
              class="finbar-btn-primary"
            >
              {{ pending ? "Opslaan…" : "Toevoegen aan planning" }}
            </button>
          </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
