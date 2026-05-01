<script setup lang="ts">
import ProjectTeamAddPopover from "@/components/ProjectTeamAddPopover.vue";
import TodayAddToolbarButton from "@/components/TodayAddToolbarButton.vue";
import WorkerEditDialog from "@/components/WorkerEditDialog.vue";
import WorkerNewDialog from "@/components/WorkerNewDialog.vue";
import WorkerTeamRuleBlock from "@/components/WorkerTeamRuleBlock.vue";
import {
  fetchTeamDisplayRules,
  type TeamDisplayRule,
} from "@/lib/teamDisplayRulesApi";
import { formatWorkerTradesLabel } from "@/lib/workerTrades";
import { useJobsStore } from "@/stores/jobs";
import type { Worker } from "@/stores/workers";
import { useWorkersStore } from "@/stores/workers";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

defineOptions({ name: "WorkersView" });

const route = useRoute();
const projectId = computed(() => route.params.projectId as string);

const workers = useWorkersStore();
const jobs = useJobsStore();

const teamMetaLoading = ref(true);
const teamMetaError = ref("");

const teamDisplayRules = ref<Record<string, TeamDisplayRule>>({});
const teamDisplayRulesError = ref("");

const teamAddOpen = ref(false);
const workerNewOpen = ref(false);
/** Na nieuw contact vanuit team: modaal heropenen en hiernaar scrollen in de lijst. */
const teamAddRevealWorkerId = ref<string | null>(null);
const workerEditOpen = ref(false);
const workerEditId = ref<string | null>(null);

const workerIdsOnProject = computed(() => {
  const ids = jobs.scheduledWorkerIdsByJobId[projectId.value];
  return new Set(ids ?? []);
});

const teamList = computed(() =>
  workers.list
    .filter((w) => workerIdsOnProject.value.has(w.id))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "nl", { sensitivity: "base" }),
    ),
);

/** Stabiel voor watch: zelfde team → zelfde string; geen `deep` op objecten nodig. */
const teamListIdsKey = computed(() =>
  teamList.value
    .map((w) => w.id)
    .slice()
    .sort()
    .join(","),
);

const pageLoading = computed(
  () => workers.listLoading || teamMetaLoading.value,
);

const pageError = computed(() => workers.listError || teamMetaError.value);

async function loadTeamDisplayRules() {
  const ids = teamList.value.map((w) => w.id);
  teamDisplayRulesError.value = "";
  if (ids.length === 0) {
    teamDisplayRules.value = {};
    return;
  }
  try {
    teamDisplayRules.value = await fetchTeamDisplayRules(ids);
  } catch (e) {
    teamDisplayRules.value = {};
    teamDisplayRulesError.value =
      e instanceof Error ? e.message : "Kon regels niet laden";
  }
}

onMounted(async () => {
  teamMetaLoading.value = true;
  teamMetaError.value = "";
  await workers.fetchList();
  try {
    await jobs.fetchScheduledWorkerIds(projectId.value);
  } catch (e) {
    teamMetaError.value =
      e instanceof Error ? e.message : "Kon projectteam niet laden";
  } finally {
    teamMetaLoading.value = false;
  }
});

watch(
  teamListIdsKey,
  () => {
    void loadTeamDisplayRules();
  },
  { immediate: true },
);

async function onTeamAddPopoverUpdated() {
  try {
    await jobs.fetchScheduledWorkerIds(projectId.value);
  } catch {
    /* verversen mislukt */
  }
  await loadTeamDisplayRules();
}

async function onOpenNewContact() {
  teamAddRevealWorkerId.value = null;
  teamAddOpen.value = false;
  await nextTick();
  workerNewOpen.value = true;
}

async function onWorkerNewCreated(worker: Worker) {
  await workers.fetchList();
  await onTeamAddPopoverUpdated();
  teamAddRevealWorkerId.value = worker.id;
  teamAddOpen.value = true;
}

function onTeamAddRevealApplied() {
  teamAddRevealWorkerId.value = null;
}

function openWorkerEdit(id: string) {
  workerEditId.value = id;
  workerEditOpen.value = true;
}

watch(workerEditOpen, (v) => {
  if (!v) workerEditId.value = null;
});

async function onWorkerEditUpdated() {
  await workers.fetchList();
  await onTeamAddPopoverUpdated();
}
</script>

<template>
  <div class="space-y-3">
    <p
      v-if="pageLoading"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>

    <!--
      Buiten de article: WorkerNewForm roept bij mount fetchList() aan. Zat de
      dialoog in de article, dan unmount die bij listLoading en remount opnieuw →
      eindeloze /api/workers loop.
    -->
    <ProjectTeamAddPopover
      v-model="teamAddOpen"
      :project-id="projectId"
      :reveal-worker-id="teamAddRevealWorkerId"
      @updated="onTeamAddPopoverUpdated"
      @open-new-contact="onOpenNewContact"
      @reveal-worker-applied="onTeamAddRevealApplied"
    />

    <WorkerNewDialog
      v-model="workerNewOpen"
      @created="onWorkerNewCreated"
    />

    <WorkerEditDialog
      v-model="workerEditOpen"
      :worker-id="workerEditId"
      variant="project"
      :project-id="projectId"
      @updated="onWorkerEditUpdated"
    />

    <article
      v-if="!pageLoading"
      class="finbar-page-article-shell"
    >
      <header
        class="border-b border-zinc-200/90 py-3 dark:border-zinc-700/80"
      >
        <div
          class="flex min-w-0 items-center justify-between gap-3"
        >
          <div class="min-w-0 px-0.5">
            <h1
              class="text-base font-semibold text-zinc-900 dark:text-white"
            >
              Team
            </h1>
          </div>
          <TodayAddToolbarButton
            pill
            label="Teamlid uit netwerk toevoegen"
            class="shrink-0"
            @click="teamAddOpen = true"
          />
        </div>
        <p
          v-if="pageError"
          class="mt-2 text-sm text-red-500"
        >
          {{ pageError }}
        </p>
      </header>

      <div
        v-if="!pageError"
        class="mt-0 space-y-3 finbar-inset-bleed sm:mt-2.5"
      >
        <p
          v-if="teamDisplayRulesError"
          class="text-sm text-amber-800 dark:text-amber-400/90"
        >
          {{ teamDisplayRulesError }} — regels per teamlid kunnen
          ontbreken.
        </p>
        <ul
          v-if="teamList.length"
          class="finbar-list-shell"
        >
          <li
            v-for="w in teamList"
            :key="w.id"
          >
            <button
              type="button"
              class="finbar-list-row !grid !min-h-12 !w-full !py-1.5 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-0 text-left text-zinc-900 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:!py-2 dark:text-zinc-100"
              @click="openWorkerEdit(w.id)"
            >
              <span
                class="self-start shrink-0 pr-1 text-left text-sm font-medium whitespace-nowrap sm:self-center sm:min-w-0 sm:truncate sm:pr-3 sm:leading-snug"
                :title="w.name"
              >{{ w.name }}</span>
              <div
                class="hidden min-h-0 w-full min-w-0 sm:flex sm:items-center"
              >
                <WorkerTeamRuleBlock
                  :availability="teamDisplayRules[w.id]?.availability ?? null"
                  :absence="teamDisplayRules[w.id]?.absence ?? []"
                />
              </div>
              <span
                v-if="w.trades?.length"
                class="min-w-0 self-start break-words text-right text-xs [overflow-wrap:anywhere] text-zinc-600 sm:shrink-0 sm:self-center dark:text-zinc-500"
              >{{ formatWorkerTradesLabel(w.trades) }}</span>
            </button>
          </li>
        </ul>
        <p
          v-else
          class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
        >
          Er zijn nog geen teamleden toegevoegd aan dit project.
        </p>
      </div>
    </article>
  </div>
</template>
