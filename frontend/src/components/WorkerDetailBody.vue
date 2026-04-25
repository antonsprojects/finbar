<script setup lang="ts">
import WorkerGegevensProjecten from "@/components/WorkerGegevensProjecten.vue";
import WorkerTradeInput from "@/components/WorkerTradeInput.vue";
import WorkerAvailabilityPeriodsSection from "@/components/WorkerAvailabilityPeriodsSection.vue";
import WorkerUnavailabilitySection from "@/components/WorkerUnavailabilitySection.vue";
import {
  fetchWorkerScheduleNoteRows,
  formatScheduleNoteDateYmd,
} from "@/lib/scheduleNotesApi";
import type { ScheduleAssignmentRow } from "@/stores/scheduleAssignments";
import type { Worker } from "@/stores/workers";
import { useWorkersStore } from "@/stores/workers";
import { computed, onMounted, ref, watch } from "vue";

defineOptions({ name: "WorkerDetailBody" });

const props = defineProps<{
  workerId: string;
  /** Alleen in projectcontext (teamlid); ontbreekt bij netwerk. */
  projectId?: string;
  /** Titelbalk: "Relatie" of "Teamlid" (zelfde lagen als `App`/`ProjectLayout` header). */
  headTitle: string;
}>();

const emit = defineEmits<{
  updated: [];
}>();

const workers = useWorkersStore();

const isGlobalContext = computed(() => !props.projectId);

const projectIdForFilter = computed(() => props.projectId);

const worker = ref<Worker | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref("");

const firstName = ref("");
const lastName = ref("");
const trade = ref("");
const notes = ref("");

const tradeSuggestions = computed(() =>
  workers.networkTradeSuggestions(props.workerId),
);

type MainTab = "gegevens" | "beschikbaarheid" | "notities";
type BeschikbaarheidSub = "beschikbaar" | "nietBeschikbaar";

const activeMain = ref<MainTab>("gegevens");
const beschikbaarheidSub = ref<BeschikbaarheidSub>("beschikbaar");

const navPillActive =
  "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100";
const navPillIdle =
  "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200";
const pillButtonClass =
  "finbar-pill-height inline-flex min-w-0 max-sm:flex-1 sm:shrink-0 items-center justify-center overflow-hidden text-ellipsis rounded-[calc(var(--finbar-radius-sm))] px-2 text-center text-xs font-medium leading-tight transition-colors sm:px-3 sm:whitespace-nowrap";

const scheduleNoteRows = ref<ScheduleAssignmentRow[]>([]);
const scheduleNotesLoading = ref(false);
const scheduleNotesError = ref("");

const savingNotities = ref(false);

const tabListLabel = computed(() =>
  isGlobalContext.value ? "Relatiesecties" : "Teamlid-secties",
);

onMounted(() => {
  void workers.fetchList();
});

async function load() {
  loading.value = true;
  error.value = "";
  worker.value = null;
  try {
    const w = await workers.fetchWorker(props.workerId);
    worker.value = w;
    if (w) {
      firstName.value = w.firstName;
      lastName.value = w.lastName;
      trade.value = w.trade ?? "";
      notes.value = w.notes ?? "";
    }
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : isGlobalContext.value
          ? "Kon relatie niet laden"
          : "Kon teamlid niet laden";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.workerId,
  () => {
    activeMain.value = "gegevens";
    beschikbaarheidSub.value = "beschikbaar";
    void load();
  },
  { immediate: true },
);

async function loadScheduleNotes() {
  scheduleNotesError.value = "";
  scheduleNoteRows.value = [];
  if (!props.workerId) return;
  scheduleNotesLoading.value = true;
  try {
    scheduleNoteRows.value = await fetchWorkerScheduleNoteRows({
      workerId: props.workerId,
      jobId: projectIdForFilter.value,
    });
  } catch (e) {
    scheduleNotesError.value =
      e instanceof Error ? e.message : "Kon inplanningsnotities niet laden";
  } finally {
    scheduleNotesLoading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = "";
  try {
    const updated = await workers.updateWorker(props.workerId, {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      trade: trade.value.trim() || null,
    });
    worker.value = updated;
    emit("updated");
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Kon niet opslaan";
  } finally {
    saving.value = false;
  }
}

async function saveNotities() {
  savingNotities.value = true;
  error.value = "";
  try {
    const updated = await workers.updateWorker(props.workerId, {
      notes: notes.value.trim() || null,
    });
    worker.value = updated;
    emit("updated");
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Kon notities niet opslaan";
  } finally {
    savingNotities.value = false;
  }
}

watch(activeMain, (t) => {
  if (t === "notities" && worker.value) {
    void loadScheduleNotes();
  }
});
</script>

<template>
  <div
    class="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col text-zinc-900 dark:text-zinc-100"
  >
    <!-- Vaste bovenbalk: lijn sluitkruisje (z-20, TodayModalShell) = titel, niet de tabs. -->
    <header
      class="relative z-10 shrink-0 border-b border-zinc-200 bg-zinc-50 pt-[max(0.25rem,env(safe-area-inset-top,0px))] dark:border-zinc-800/80 dark:bg-zinc-950"
    >
      <div
        v-if="!worker"
        class="flex min-h-11 w-full min-w-0 items-center px-4 pr-12 sm:min-h-12 sm:pl-6 sm:pr-16"
      >
        <h1
          class="m-0 flex min-h-11 min-w-0 flex-1 items-center self-stretch py-0 text-base font-semibold leading-6 tracking-tight text-zinc-900 sm:min-h-12 sm:leading-6 dark:text-zinc-100"
        >
          <span class="min-w-0 flex-1 truncate">{{ headTitle }}</span>
        </h1>
      </div>

      <div
        v-else
        class="grid w-full grid-cols-1 sm:min-h-12 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-2 sm:px-6 sm:py-1.5 sm:pr-16"
      >
        <h1
          class="m-0 row-start-1 flex min-h-11 min-w-0 items-center self-stretch px-4 pr-12 py-0 text-base font-semibold leading-6 tracking-tight text-zinc-900 sm:col-start-1 sm:row-start-1 sm:min-h-12 sm:max-w-sm sm:shrink-0 sm:px-0 sm:pr-2 sm:leading-6 dark:text-zinc-100"
        >
          <span class="min-w-0 flex-1 truncate">{{ headTitle }}</span>
        </h1>
        <div
          class="row-start-2 w-full min-w-0 max-sm:px-4 max-sm:pb-2.5 sm:row-start-1 sm:col-start-2 sm:shrink-0 sm:px-0 sm:pb-0"
        >
          <nav
            class="flex w-full min-w-0 max-w-full justify-stretch sm:justify-center"
            :aria-label="tabListLabel"
          >
            <div
              class="flex w-full min-w-0 sm:inline-flex sm:w-auto sm:max-w-full sm:flex-nowrap sm:shrink-0 sm:items-center sm:justify-center sm:overflow-x-auto rounded-[var(--finbar-radius)] border border-zinc-300 bg-zinc-100/80 p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-zinc-600 dark:bg-zinc-900/60 sm:overflow-x-auto [&::-webkit-scrollbar]:hidden"
              role="tablist"
            >
              <button
                id="wdb-tab-btn-gegevens"
                type="button"
                :class="[pillButtonClass, activeMain === 'gegevens' ? navPillActive : navPillIdle]"
                role="tab"
                :aria-selected="activeMain === 'gegevens'"
                aria-controls="wdb-panel-gegevens"
                :tabindex="activeMain === 'gegevens' ? 0 : -1"
                @click="activeMain = 'gegevens'"
              >
                Gegevens
              </button>
              <button
                id="wdb-tab-btn-beschikbaarheid"
                type="button"
                :class="[pillButtonClass, activeMain === 'beschikbaarheid' ? navPillActive : navPillIdle]"
                role="tab"
                :aria-selected="activeMain === 'beschikbaarheid'"
                aria-controls="wdb-beschikbaarheid-wrap"
                :tabindex="activeMain === 'beschikbaarheid' ? 0 : -1"
                @click="activeMain = 'beschikbaarheid'"
              >
                Beschikbaarheid
              </button>
              <button
                id="wdb-tab-btn-notities"
                type="button"
                :class="[pillButtonClass, activeMain === 'notities' ? navPillActive : navPillIdle]"
                role="tab"
                :aria-selected="activeMain === 'notities'"
                aria-controls="wdb-panel-notities"
                :tabindex="activeMain === 'notities' ? 0 : -1"
                @click="activeMain = 'notities'"
              >
                Notities
              </button>
            </div>
          </nav>
        </div>
        <div
          class="row-start-1 col-start-1 max-sm:hidden sm:col-start-3 sm:row-start-1 sm:justify-self-end"
          aria-hidden="true"
        >
          <div class="h-9 w-9" />
        </div>
      </div>

      <div
        v-show="worker && activeMain === 'beschikbaarheid'"
        id="wdb-beschikbaarheid-wrap"
        class="border-t border-zinc-200/90 dark:border-zinc-700/80"
        role="region"
        aria-label="Beschikbaarheid"
      >
        <div
          class="flex w-full max-sm:justify-stretch sm:justify-center px-4 sm:px-6"
          role="tablist"
          aria-label="Beschikbaarheid weergave"
        >
          <div
            class="flex w-full min-w-0 sm:inline-flex sm:w-auto sm:gap-0.5"
          >
            <button
              id="wdb-subtab-btn-beschikbaar"
              type="button"
              class="min-h-10 min-w-0 max-sm:flex-1 rounded-t-md px-2 py-2 text-center text-sm font-medium transition-colors sm:px-3 sm:text-left"
              :class="[
                beschikbaarheidSub === 'beschikbaar'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-white'
                  : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
              ]"
              role="tab"
              :aria-selected="beschikbaarheidSub === 'beschikbaar'"
              aria-controls="wdb-panel-beschikbaarheid"
              :tabindex="beschikbaarheidSub === 'beschikbaar' ? 0 : -1"
              @click="beschikbaarheidSub = 'beschikbaar'"
            >
              Beschikbaar
            </button>
            <button
              id="wdb-subtab-btn-niet"
              type="button"
              class="min-h-10 min-w-0 max-sm:flex-1 rounded-t-md px-2 py-2 text-center text-sm font-medium transition-colors sm:px-3 sm:text-left"
              :class="[
                beschikbaarheidSub === 'nietBeschikbaar'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-white'
                  : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200',
              ]"
              role="tab"
              :aria-selected="beschikbaarheidSub === 'nietBeschikbaar'"
              aria-controls="wdb-panel-niet"
              :tabindex="beschikbaarheidSub === 'nietBeschikbaar' ? 0 : -1"
              @click="beschikbaarheidSub = 'nietBeschikbaar'"
            >
              Niet beschikbaar
            </button>
          </div>
        </div>
      </div>
    </header>

    <p
      v-if="loading"
      class="min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300 sm:px-6"
    >
      Laden…
    </p>
    <p
      v-else-if="error && !worker"
      class="min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-4 py-3 text-sm text-red-500 dark:bg-zinc-950 sm:px-6"
    >
      {{ error }}
    </p>

    <template
      v-else-if="worker"
    >
      <div
        class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-zinc-50 dark:bg-zinc-950"
      >
        <div
          v-show="activeMain === 'gegevens'"
          id="wdb-panel-gegevens"
          class="space-y-3 px-4 py-2.5 sm:px-6 sm:py-3"
          role="tabpanel"
          aria-labelledby="wdb-tab-btn-gegevens"
          tabindex="0"
        >
        <form
          class="space-y-3"
          @submit.prevent="save"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                class="finbar-field-label"
                for="wdb-first"
              >Voornaam</label>
              <input
                id="wdb-first"
                v-model="firstName"
                type="text"
                required
                maxlength="200"
                class="finbar-field-input"
                autocomplete="given-name"
              >
            </div>
            <div>
              <label
                class="finbar-field-label"
                for="wdb-last"
              >Achternaam</label>
              <input
                id="wdb-last"
                v-model="lastName"
                type="text"
                maxlength="200"
                class="finbar-field-input"
                autocomplete="family-name"
              >
            </div>
          </div>
          <WorkerTradeInput
            v-model="trade"
            input-id="wdb-trade"
            :suggestions="tradeSuggestions"
          />
          <WorkerGegevensProjecten :worker-id="worker.id" />

          <p
            v-if="error"
            class="text-sm text-red-400"
          >
            {{ error }}
          </p>

          <button
            type="submit"
            :disabled="saving"
            class="finbar-btn-primary"
          >
            {{ saving ? "Opslaan…" : "Opslaan" }}
          </button>
        </form>
        </div>

        <div
          v-show="activeMain === 'beschikbaarheid' && beschikbaarheidSub === 'beschikbaar'"
          id="wdb-panel-beschikbaarheid"
          class="px-4 py-2.5 sm:px-6 sm:py-3"
          role="tabpanel"
          aria-labelledby="wdb-subtab-btn-beschikbaar"
          tabindex="0"
        >
          <WorkerAvailabilityPeriodsSection :worker-id="worker.id" />
        </div>

        <div
          v-show="activeMain === 'beschikbaarheid' && beschikbaarheidSub === 'nietBeschikbaar'"
          id="wdb-panel-niet"
          class="px-4 py-2.5 sm:px-6 sm:py-3"
          role="tabpanel"
          aria-labelledby="wdb-subtab-btn-niet"
          tabindex="0"
        >
          <WorkerUnavailabilitySection
            :worker-id="worker.id"
            :embedded="true"
          />
        </div>

        <div
          v-show="activeMain === 'notities'"
          id="wdb-panel-notities"
          class="space-y-5 px-4 py-2.5 sm:px-6 sm:py-3"
          role="tabpanel"
          aria-labelledby="wdb-tab-btn-notities"
          tabindex="0"
        >
        <form
          class="space-y-3"
          @submit.prevent="saveNotities"
        >
          <div>
            <label
              class="finbar-field-label"
              for="wdb-notes"
            >Algemene notitie</label>
            <textarea
              id="wdb-notes"
              v-model="notes"
              rows="4"
              maxlength="10000"
              class="finbar-field-input"
              :placeholder="
                isGlobalContext
                  ? 'Vrij tekstveld over deze relatie'
                  : 'Vrij tekstveld over dit teamlid'
              "
            />
          </div>
          <p
            v-if="error"
            class="text-sm text-red-400"
          >
            {{ error }}
          </p>
          <button
            type="submit"
            :disabled="savingNotities"
            class="finbar-btn-primary"
          >
            {{ savingNotities ? "Opslaan…" : "Notitie opslaan" }}
          </button>
        </form>

        <section
          class="space-y-2 border-t border-zinc-200/90 pt-4 dark:border-zinc-700/80"
        >
          <h2 class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Inplanning
          </h2>
          <p
            v-if="scheduleNotesLoading"
            class="text-sm text-zinc-500 dark:text-zinc-400"
          >
            Laden…
          </p>
          <p
            v-else-if="scheduleNotesError"
            class="text-sm text-red-400"
          >
            {{ scheduleNotesError }}
          </p>
          <ul
            v-else-if="scheduleNoteRows.length"
            class="space-y-2 text-sm"
          >
            <li
              v-for="row in scheduleNoteRows"
              :key="row.id"
              class="rounded-md border border-zinc-200/90 bg-white px-3 py-2 dark:border-zinc-600/80 dark:bg-zinc-900/40"
            >
              <p
                class="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                {{ formatScheduleNoteDateYmd(row.date) }}
                <span
                  v-if="row.job?.name"
                  class="text-zinc-600 dark:text-zinc-500"
                > · {{ row.job.name }}</span>
              </p>
              <p class="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] text-zinc-900 dark:text-zinc-100">
                {{ row.notes?.trim() }}
              </p>
            </li>
          </ul>
          <p
            v-else
            class="text-sm text-zinc-500 dark:text-zinc-400"
          >
            Nog geen dagen met een inplanningsnotitie<template v-if="projectIdForFilter">
              op dit project</template>.
          </p>
        </section>
        </div>
      </div>
    </template>
  </div>
</template>
