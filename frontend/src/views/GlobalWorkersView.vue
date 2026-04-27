<script setup lang="ts">
import TodayAddToolbarButton from "@/components/TodayAddToolbarButton.vue";
import WorkerEditDialog from "@/components/WorkerEditDialog.vue";
import WorkerNewDialog from "@/components/WorkerNewDialog.vue";
import WorkerTeamRuleBlock from "@/components/WorkerTeamRuleBlock.vue";
import {
  fetchTeamDisplayRules,
  type TeamDisplayRule,
} from "@/lib/teamDisplayRulesApi";
import type { Worker } from "@/stores/workers";
import { useWorkersStore } from "@/stores/workers";
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";

defineOptions({ name: "GlobalWorkersView" });

const workers = useWorkersStore();
const workerNewOpen = ref(false);
const workerEditOpen = ref(false);
const workerEditId = ref<string | null>(null);
const { list: workerList, listLoading, listError } = storeToRefs(workers);

const teamDisplayRules = ref<Record<string, TeamDisplayRule>>({});
const teamDisplayRulesError = ref("");

const contactSearch = ref("");

const filteredWorkerList = computed(() => {
  const q = contactSearch.value.trim().toLowerCase();
  if (!q) return workerList.value;
  return workerList.value.filter((w) => {
    const blob = [w.name, w.firstName, w.lastName, w.trade ?? "", w.notes ?? ""]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
});

const workerListIdsKey = computed(() =>
  workerList.value
    .map((w) => w.id)
    .slice()
    .sort()
    .join(","),
);

async function loadTeamDisplayRules() {
  const ids = workerList.value.map((w) => w.id);
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

onMounted(() => {
  void workers.fetchList();
});

watch(
  workerListIdsKey,
  () => {
    void loadTeamDisplayRules();
  },
  { immediate: true },
);

function openWorkerEdit(id: string) {
  workerEditId.value = id;
  workerEditOpen.value = true;
}

watch(workerEditOpen, (v) => {
  if (!v) workerEditId.value = null;
});

async function onWorkerEditUpdated() {
  await workers.fetchList();
  void loadTeamDisplayRules();
}

async function onWorkerCreated(w: Worker) {
  await workers.fetchList();
  await loadTeamDisplayRules();
  openWorkerEdit(w.id);
}
</script>

<template>
  <div class="space-y-3">
    <p
      v-if="listLoading"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>

    <article
      v-else
      class="finbar-page-article-shell max-sm:!pt-0"
    >
      <header
        class="border-b border-zinc-200/90 pb-2 dark:border-zinc-700/80"
      >
        <!-- sm: title + knop, zoekbalk op volle breedte -->
        <div
          v-if="workerList.length"
          class="md:hidden"
        >
          <div
            class="mb-2 flex items-center justify-between gap-x-3 gap-y-2"
          >
            <div class="min-w-0 px-0.5">
              <h1
                class="text-base font-semibold text-zinc-900 dark:text-white"
              >
                Netwerk
              </h1>
            </div>
            <TodayAddToolbarButton
              pill
              label="Relatie toevoegen"
              @click="workerNewOpen = true"
            />
          </div>
          <div class="relative w-full min-w-0">
            <span
              class="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            >
              <svg
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </span>
            <input
              v-model="contactSearch"
              type="search"
              class="finbar-pill-height box-border w-full rounded-full border border-zinc-300 bg-white py-0 pr-3 pl-10 text-sm leading-normal text-zinc-900 shadow-inner placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
              placeholder="Zoeken in netwerk"
              aria-label="Zoeken in netwerk"
              autocomplete="off"
              enterkeyhint="search"
              spellcheck="false"
            >
          </div>
        </div>
        <div
          v-else
          class="md:hidden"
        >
          <div
            class="flex items-center justify-between gap-x-3 gap-y-2"
          >
            <div class="min-w-0 px-0.5">
              <h1
                class="text-base font-semibold text-zinc-900 dark:text-white"
              >
                Netwerk
              </h1>
            </div>
            <TodayAddToolbarButton
              pill
              label="Relatie toevoegen"
              @click="workerNewOpen = true"
            />
          </div>
        </div>
        <!-- md+: titel links, zoeken + knop rechts aaneen -->
        <div
          v-if="workerList.length"
          class="hidden min-w-0 items-center justify-between gap-3 md:flex"
        >
          <div class="min-w-0 px-0.5">
            <h1
              class="text-base font-semibold text-zinc-900 dark:text-white"
            >
              Netwerk
            </h1>
          </div>
          <div
            class="flex min-w-0 shrink-0 items-center justify-end gap-2"
          >
            <div class="relative w-56 min-w-0 sm:w-60">
              <span
                class="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
                aria-hidden="true"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
              </span>
              <input
                v-model="contactSearch"
                type="search"
                class="finbar-pill-height box-border w-full rounded-full border border-zinc-300 bg-white py-0 pr-3 pl-10 text-sm leading-normal text-zinc-900 shadow-inner placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
                placeholder="Zoeken in netwerk"
                aria-label="Zoeken in netwerk"
                autocomplete="off"
                enterkeyhint="search"
                spellcheck="false"
              >
            </div>
            <TodayAddToolbarButton
              pill
              label="Relatie toevoegen"
              @click="workerNewOpen = true"
            />
          </div>
        </div>
        <div
          v-else
          class="hidden items-center justify-between gap-3 md:flex"
        >
          <div class="min-w-0 px-0.5">
            <h1
              class="text-base font-semibold text-zinc-900 dark:text-white"
            >
              Netwerk
            </h1>
          </div>
          <TodayAddToolbarButton
            pill
            label="Relatie toevoegen"
            @click="workerNewOpen = true"
          />
        </div>
        <p
          v-if="listError"
          class="mt-2 text-sm text-red-500"
        >
          {{ listError }}
        </p>
      </header>

      <div
        v-if="!listError"
        class="mt-0 space-y-3 finbar-inset-bleed sm:mt-2.5"
      >
        <p
          v-if="teamDisplayRulesError"
          class="text-sm text-amber-800 dark:text-amber-400/90"
        >
          {{ teamDisplayRulesError }} — regels per relatie kunnen
          ontbreken.
        </p>
        <ul
          v-if="filteredWorkerList.length"
          class="finbar-list-shell"
        >
          <li
            v-for="w in filteredWorkerList"
            :key="w.id"
          >
            <button
              type="button"
              class="finbar-list-row !grid !min-h-12 !w-full !py-1.5 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0 text-left text-zinc-900 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:!py-2 dark:text-zinc-100"
              @click="openWorkerEdit(w.id)"
            >
              <span
                class="min-w-0 self-center pr-1 text-left font-medium [overflow-wrap:anywhere] sm:pr-3 sm:leading-snug sm:truncate"
                :title="w.name"
              >{{ w.name }}</span>
              <div
                class="hidden min-h-0 w-full min-w-0 self-center sm:flex sm:items-center"
              >
                <WorkerTeamRuleBlock
                  :availability="teamDisplayRules[w.id]?.availability ?? null"
                  :absence="teamDisplayRules[w.id]?.absence ?? []"
                />
              </div>
              <span
                v-if="w.trade"
                class="shrink-0 self-center text-right text-xs text-zinc-600 dark:text-zinc-500"
              >{{ w.trade }}</span>
            </button>
          </li>
        </ul>
        <div
          v-else-if="!workerList.length"
          class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
        >
          Voeg je eerste relatie toe aan het netwerk.
        </div>
        <p
          v-else
          class="text-sm text-zinc-600 dark:text-zinc-300"
        >
          Geen relaties die passen bij deze zoekopdracht.
          <button
            type="button"
            class="finbar-link cursor-pointer underline-offset-2 hover:underline"
            @click="contactSearch = ''"
          >
            Wis zoekterm
          </button>
        </p>
      </div>
    </article>

    <WorkerNewDialog
      v-model="workerNewOpen"
      @created="onWorkerCreated"
    />

    <WorkerEditDialog
      v-model="workerEditOpen"
      :worker-id="workerEditId"
      variant="global"
      @updated="onWorkerEditUpdated"
    />
  </div>
</template>
