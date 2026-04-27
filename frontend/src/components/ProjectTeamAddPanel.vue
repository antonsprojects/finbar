<script setup lang="ts">
import { removeWorkerFromScheduleJob } from "@/lib/workerScheduleJobsApi";
import { useJobsStore } from "@/stores/jobs";
import { useScheduleAssignmentsStore } from "@/stores/scheduleAssignments";
import { useWorkersStore } from "@/stores/workers";
import { computed, nextTick, onMounted, ref, watch } from "vue";

defineOptions({ name: "ProjectTeamAddPanel" });

const props = defineProps<{
  projectId: string;
  /** Eénmalig: na toevoegen contact scrollen in de lijst (Team-context). */
  revealWorkerId?: string | null;
}>();

const emit = defineEmits<{
  "team-updated": [];
  "reveal-worker-done": [];
}>();

const workers = useWorkersStore();
const jobs = useJobsStore();
const schedule = useScheduleAssignmentsStore();

const scheduledMetaLoading = ref(true);
const scheduledMetaError = ref("");

async function load() {
  scheduledMetaLoading.value = true;
  scheduledMetaError.value = "";
  /* `WorkersView` laadt het netwerk al; overslaan als de store al vulling heeft. */
  if (workers.list.length === 0) {
    await workers.fetchList();
  }
  try {
    await jobs.fetchScheduledWorkerIds(props.projectId);
  } catch (e) {
    scheduledMetaError.value =
      e instanceof Error ? e.message : "Kon planning niet laden";
  } finally {
    scheduledMetaLoading.value = false;
  }
  syncStagedFromServer();
}

onMounted(() => {
  void load();
});

watch(
  () => props.projectId,
  () => {
    void load();
  },
);

const workerIdsScheduledOnProject = computed(() => {
  const ids = jobs.scheduledWorkerIdsByJobId[props.projectId] ?? [];
  return new Set(ids);
});

/** Server state when the panel last loaded or save completed. */
const baselineOnProject = ref<Set<string>>(new Set());
/** Edited team membership; only persisted when the user clicks Opslaan. */
const stagedOnProject = ref<Set<string>>(new Set());

function syncStagedFromServer() {
  const s = new Set(workerIdsScheduledOnProject.value);
  baselineOnProject.value = s;
  stagedOnProject.value = new Set(s);
}

function sortByName<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    a.name.localeCompare(b.name, "nl", { sensitivity: "base" }),
  );
}

const networkRows = computed(() => sortByName(workers.list));

const hasAnyWorkers = computed(() => workers.list.length > 0);

const everyoneOnProject = computed(
  () =>
    hasAnyWorkers.value &&
    workers.list.every((w) => stagedOnProject.value.has(w.id)),
);

const noOneOnProject = computed(
  () =>
    hasAnyWorkers.value &&
    workers.list.every((w) => !stagedOnProject.value.has(w.id)),
);

function isOnProject(workerId: string): boolean {
  return stagedOnProject.value.has(workerId);
}

const loading = computed(
  () => workers.listLoading || scheduledMetaLoading.value,
);

const loadError = computed(
  () => workers.listError || scheduledMetaError.value,
);

const saving = ref(false);
const actionError = ref("");

const search = ref("");

const filteredNetworkRows = computed(() => {
  const list = networkRows.value;
  const q = search.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter((w) => {
    if (w.name.toLowerCase().includes(q)) return true;
    if (w.trade && w.trade.toLowerCase().includes(q)) return true;
    return false;
  });
});

const hasSearchNoHits = computed(
  () =>
    search.value.trim() !== "" &&
    networkRows.value.length > 0 &&
    filteredNetworkRows.value.length === 0,
);

const listScrollEl = ref<HTMLElement | null>(null);

function doneReveal() {
  emit("reveal-worker-done");
}

watch(
  () =>
    [props.revealWorkerId, loading.value, filteredNetworkRows.value.length] as const,
  async ([id, busy]) => {
    if (!id || busy) return;
    if (!workers.list.some((w) => w.id === id)) {
      doneReveal();
      return;
    }
    search.value = "";
    await nextTick();
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    const root = listScrollEl.value;
    let row = root?.querySelector<HTMLElement>(`[data-ptam-worker="${id}"]`);
    if (!row) {
      await new Promise<void>((r) => setTimeout(r, 64));
      row = listScrollEl.value?.querySelector<HTMLElement>(
        `[data-ptam-worker="${id}"]`,
      );
    }
    if (row) {
      row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    doneReveal();
  },
);

async function refreshScheduled() {
  try {
    await jobs.fetchScheduledWorkerIds(props.projectId);
  } catch {
    /* teamlijst verversen mislukt */
  }
  emit("team-updated");
}

function stageAdd(workerId: string) {
  actionError.value = "";
  const next = new Set(stagedOnProject.value);
  next.add(workerId);
  stagedOnProject.value = next;
}

function stageRemove(workerId: string) {
  actionError.value = "";
  const next = new Set(stagedOnProject.value);
  next.delete(workerId);
  stagedOnProject.value = next;
}

function toggleWorker(workerId: string) {
  if (saving.value) return;
  if (isOnProject(workerId)) {
    stageRemove(workerId);
  } else {
    stageAdd(workerId);
  }
}

async function save(): Promise<void> {
  const base = baselineOnProject.value;
  const staged = stagedOnProject.value;
  const toAdd = [...staged].filter((id) => !base.has(id));
  const toRemove = [...base].filter((id) => !staged.has(id));
  if (toAdd.length === 0 && toRemove.length === 0) {
    return;
  }
  actionError.value = "";
  saving.value = true;
  try {
    for (const workerId of toRemove) {
      await removeWorkerFromScheduleJob(workerId, props.projectId);
    }
    for (const workerId of toAdd) {
      try {
        await schedule.createInitialOnProject({
          workerId,
          jobId: props.projectId,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Kon niet toevoegen";
        if (
          !/al ingepland op dit project|staat al op het project|hoort al bij|gewone inplanning/i.test(
            msg,
          )
        ) {
          throw e;
        }
      }
    }
    await refreshScheduled();
    syncStagedFromServer();
  } catch (e) {
    actionError.value =
      e instanceof Error ? e.message : "Opslaan is mislukt";
    try {
      await jobs.fetchScheduledWorkerIds(props.projectId);
    } catch {
      /* verversen na fout mislukt */
    }
    syncStagedFromServer();
    throw e;
  } finally {
    saving.value = false;
  }
}

function resetStaged() {
  actionError.value = "";
  stagedOnProject.value = new Set(baselineOnProject.value);
}

defineExpose({
  save,
  resetStaged,
  saving,
});
</script>

<template>
  <div class="min-w-0">
    <p
      v-if="loading"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>
    <p
      v-else-if="loadError"
      class="text-sm text-red-400"
    >
      {{ loadError }}
    </p>
    <div v-else-if="hasAnyWorkers">
      <section class="space-y-4">
        <p
          v-if="noOneOnProject"
          class="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Nog niemand vanuit je netwerk op dit projectteam.
        </p>
        <p
          v-else-if="everyoneOnProject"
          class="text-sm text-zinc-600 dark:text-zinc-300"
        >
          Iedereen uit je netwerk zit op dit projectteam.
        </p>
        <div>
          <label
            class="finbar-field-label"
            for="project-team-add-search"
          >Zoeken</label>
          <input
            id="project-team-add-search"
            v-model="search"
            type="search"
            autocomplete="off"
            class="finbar-field-input"
            placeholder="Zoek op naam of beroep…"
          >
        </div>
        <p
          v-if="actionError"
          class="text-sm text-red-400"
        >
          {{ actionError }}
        </p>
        <p
          v-else-if="hasSearchNoHits"
          class="text-sm text-zinc-500 dark:text-zinc-400"
        >
          Geen resultaten voor deze zoekopdracht.
        </p>
        <div
          v-if="filteredNetworkRows.length"
          ref="listScrollEl"
          class="max-h-[min(42vh,22rem)] overflow-y-auto overflow-x-hidden rounded-md"
        >
          <ul class="finbar-list-shell text-sm">
          <li
            v-for="w in filteredNetworkRows"
            :key="w.id"
            :data-ptam-worker="w.id"
          >
            <div
              class="finbar-list-row !flex !w-full !min-w-0 !cursor-pointer !flex-row !flex-nowrap !items-center !gap-2 !py-2.5 text-zinc-900 dark:text-zinc-100"
              role="button"
              tabindex="0"
              @click="toggleWorker(w.id)"
              @keydown.enter.prevent="toggleWorker(w.id)"
              @keydown.space.prevent="toggleWorker(w.id)"
            >
              <span
                class="min-w-0 flex-1 truncate font-medium text-zinc-900 dark:text-zinc-100"
              >{{ w.name }}</span>
              <div
                class="flex min-w-0 shrink-0 items-center gap-2 pl-1"
              >
                <span
                  v-if="w.trade"
                  class="max-w-[9rem] truncate text-right text-xs text-zinc-500 sm:max-w-[12rem] dark:text-zinc-400"
                >{{ w.trade }}</span>
                <button
                  v-if="!isOnProject(w.id)"
                  type="button"
                  class="inline-flex h-7 !min-h-0 w-[6.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--finbar-radius-sm)] border border-zinc-800 bg-zinc-900 px-1.5 text-xs font-medium leading-none text-white transition-colors hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                  title="Toevoegen aan projectteam (nog niet op een dag inplannen)"
                  :disabled="saving"
                  :aria-busy="saving"
                  @click.stop="stageAdd(w.id)"
                >
                  Toevoegen
                </button>
                <button
                  v-else
                  type="button"
                  class="inline-flex h-7 !min-h-0 w-[6.5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--finbar-radius-sm)] border border-red-600/90 bg-white px-1.5 text-xs font-medium leading-none text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 dark:border-red-500/80 dark:bg-zinc-900/90 dark:text-red-400 dark:hover:bg-red-950/30"
                  title="Alle inplanningen op dit project voor dit contact wissen"
                  :disabled="saving"
                  :aria-busy="saving"
                  @click.stop="stageRemove(w.id)"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </li>
        </ul>
        </div>
      </section>
    </div>
    <p
      v-else
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Je netwerk is nog leeg.
    </p>
  </div>
</template>
