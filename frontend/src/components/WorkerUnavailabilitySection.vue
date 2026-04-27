<script setup lang="ts">
import TodayAddToolbarButton from "@/components/TodayAddToolbarButton.vue";
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import {
  formatLocalYmd,
  formatOneOffLine,
  formatWeekdayRecurringLabel,
  partitionUnavailableForLists,
  upcomingWeekdayDates,
  type RecurringUnavailabilityGroup,
} from "@/lib/workerAvailabilityDisplay";
import {
  useWorkerAvailabilityStore,
  type WorkerAvailabilityRow,
} from "@/stores/workerAvailability";
import { computed, ref, watch } from "vue";

defineOptions({ name: "WorkerUnavailabilitySection" });

const props = withDefaults(
  defineProps<{
    workerId: string;
    /** Geen eigen kaart-omlijning: voor gebruik in een bovenliggende tab/kaart. */
    embedded?: boolean;
  }>(),
  { embedded: false },
);

const availability = useWorkerAvailabilityStore();

const rows = ref<WorkerAvailabilityRow[]>([]);
const loading = ref(false);
const listError = ref("");
const actionError = ref("");

const modalOnceOpen = ref(false);
const modalRecurOpen = ref(false);

const singleFrom = ref("");
const singleTo = ref("");
/** false = één dag, true = datumbereik (vakantie e.d.) */
const periodMultiDay = ref(false);
const singleNotes = ref("");
const singlePending = ref(false);

const recurWeekday = ref(3);
const recurNotes = ref("");
const recurWeeks = ref(52);
const recurPending = ref(false);

const deletingOneOffId = ref<string | null>(null);
const deletingRecurringKey = ref<string | null>(null);

const weekdayChoices: { dow: number; label: string }[] = [
  { dow: 1, label: "Maandag" },
  { dow: 2, label: "Dinsdag" },
  { dow: 3, label: "Woensdag" },
  { dow: 4, label: "Donderdag" },
  { dow: 5, label: "Vrijdag" },
  { dow: 6, label: "Zaterdag" },
  { dow: 0, label: "Zondag" },
];

const minDateStr = computed(() => formatLocalYmd(new Date()));

const partitioned = computed(() =>
  partitionUnavailableForLists(rows.value, 3),
);

const oneOffRows = computed(() => partitioned.value.oneOff);
const recurringGroups = computed(() => partitioned.value.recurringGroups);

const bothUnavailabilityEmpty = computed(
  () => oneOffRows.value.length === 0 && recurringGroups.value.length === 0,
);

function recurringGroupKey(g: RecurringUnavailabilityGroup): string {
  return `${g.weekday}|${(g.notes ?? "").trim()}|${g.rowIds.join(",")}`;
}

async function loadRows() {
  loading.value = true;
  listError.value = "";
  actionError.value = "";
  rows.value = [];
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = formatLocalYmd(today);
    const toD = new Date(today);
    toD.setFullYear(toD.getFullYear() + 2);
    const to = formatLocalYmd(toD);
    rows.value = await availability.fetchRowsForWorkerWindow({
      workerId: props.workerId,
      from,
      to,
    });
  } catch (e) {
    listError.value =
      e instanceof Error ? e.message : "Kon afwezigheid niet laden";
  } finally {
    loading.value = false;
  }
}

function initSingleDate() {
  const today = formatLocalYmd(new Date());
  singleFrom.value = today;
  singleTo.value = today;
}

watch(
  () => props.workerId,
  () => {
    initSingleDate();
    void loadRows();
  },
  { immediate: true },
);

watch(modalOnceOpen, (open) => {
  if (open) {
    actionError.value = "";
    periodMultiDay.value = false;
    initSingleDate();
  }
});

watch(singleFrom, (from) => {
  if (!periodMultiDay.value && from) {
    singleTo.value = from;
    return;
  }
  if (from && singleTo.value && singleTo.value < from) {
    singleTo.value = from;
  }
});

watch(periodMultiDay, (multi) => {
  if (!multi && singleFrom.value) {
    singleTo.value = singleFrom.value;
  }
});

watch(modalRecurOpen, (open) => {
  if (open) {
    actionError.value = "";
  }
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function ymdRange(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const cur = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const dates: string[] = [];
  while (cur <= end) {
    dates.push(formatLocalYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

async function addSingle() {
  const from = singleFrom.value.trim();
  const to = periodMultiDay.value
    ? singleTo.value.trim()
    : from;
  if (!from || !to) return;
  if (from > to) {
    actionError.value = "De begindatum moet op of vóór de einddatum liggen.";
    return;
  }
  const dates = ymdRange(from, to);
  const notes = singleNotes.value.trim() || null;
  singlePending.value = true;
  actionError.value = "";
  try {
    for (const part of chunkArray(dates, 8)) {
      await Promise.all(
        part.map((date) =>
          availability.upsertDay({
            workerId: props.workerId,
            date,
            status: "UNAVAILABLE",
            notes,
          }),
        ),
      );
    }
    singleNotes.value = "";
    initSingleDate();
    modalOnceOpen.value = false;
    await loadRows();
  } catch (e) {
    actionError.value =
      e instanceof Error ? e.message : "Kon afwezigheid niet toevoegen";
  } finally {
    singlePending.value = false;
  }
}

async function removeOneOff(id: string) {
  deletingOneOffId.value = id;
  actionError.value = "";
  try {
    await availability.remove(id);
    await loadRows();
  } catch (e) {
    actionError.value =
      e instanceof Error ? e.message : "Kon item niet verwijderen";
  } finally {
    deletingOneOffId.value = null;
  }
}

async function addRecurring() {
  const weeks = Math.min(
    104,
    Math.max(1, Math.floor(Number(recurWeeks.value)) || 1),
  );
  recurWeeks.value = weeks;
  const dates = upcomingWeekdayDates(recurWeekday.value, weeks);
  const notes = recurNotes.value.trim() || null;
  recurPending.value = true;
  actionError.value = "";
  try {
    for (const part of chunkArray(dates, 8)) {
      await Promise.all(
        part.map((date) =>
          availability.upsertDay({
            workerId: props.workerId,
            date,
            status: "UNAVAILABLE",
            notes,
          }),
        ),
      );
    }
    modalRecurOpen.value = false;
    await loadRows();
  } catch (e) {
    actionError.value =
      e instanceof Error
        ? e.message
        : "Kon terugkerende afwezigheid niet opslaan";
  } finally {
    recurPending.value = false;
  }
}

async function removeRecurringGroup(g: RecurringUnavailabilityGroup) {
  const key = recurringGroupKey(g);
  deletingRecurringKey.value = key;
  actionError.value = "";
  try {
    await Promise.all(g.rowIds.map((id) => availability.remove(id)));
    await loadRows();
  } catch (e) {
    actionError.value =
      e instanceof Error ? e.message : "Kon patroon niet verwijderen";
  } finally {
    deletingRecurringKey.value = null;
  }
}

</script>

<template>
  <component
    :is="embedded ? 'div' : 'article'"
    class="min-w-0"
    :class="
      embedded
        ? undefined
        : 'finbar-page-article-shell'
    "
    :aria-labelledby="embedded ? undefined : 'wu-heading'"
  >
    <header class="space-y-2">
      <h2
        id="wu-heading"
        :class="[
          embedded
            ? 'sr-only'
            : 'text-lg font-semibold leading-snug text-zinc-900 dark:text-white',
        ]"
      >
        Niet beschikbaar
      </h2>
      <div
        class="grid w-full grid-cols-2 gap-2"
        :class="embedded ? '' : 'hidden md:grid'"
      >
        <TodayAddToolbarButton
          pill
          full-width
          label="Eenmalig"
          @click="modalOnceOpen = true"
        />
        <TodayAddToolbarButton
          pill
          full-width
          label="Wekelijks"
          @click="modalRecurOpen = true"
        />
      </div>
    </header>

    <p
      v-if="loading"
      class="mt-2 text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>
    <p
      v-else-if="listError"
      class="mt-2 text-sm text-red-400"
    >
      {{ listError }}
    </p>

    <template v-else>
      <p
        v-if="actionError"
        class="mt-2 text-sm text-red-400"
      >
        {{ actionError }}
      </p>

      <div
        v-if="bothUnavailabilityEmpty"
        :class="['mt-2.5', embedded ? '' : 'finbar-inset-bleed']"
      >
        <div
          v-if="!embedded"
          class="grid grid-cols-2 gap-2 md:hidden"
        >
          <TodayAddToolbarButton
            pill
            full-width
            label="Eenmalig"
            @click="modalOnceOpen = true"
          />
          <TodayAddToolbarButton
            pill
            full-width
            label="Wekelijks"
            @click="modalRecurOpen = true"
          />
        </div>
      </div>
      <div
        v-else
        :class="['mt-2.5 space-y-3', embedded ? '' : 'finbar-inset-bleed']"
      >
        <section class="space-y-1">
          <div class="md:hidden">
            <TodayAddToolbarButton
              pill
              label="Eenmalig"
              @click="modalOnceOpen = true"
            />
          </div>
          <h3
            class="hidden text-xs font-semibold uppercase tracking-wide text-zinc-500 md:block dark:text-zinc-400"
          >
            Losse data
          </h3>
          <ul
            v-if="oneOffRows.length > 0"
            class="finbar-list-shell text-sm"
          >
            <li
              v-for="r in oneOffRows"
              :key="r.id"
              class="finbar-list-row flex flex-wrap items-center justify-between gap-2 text-zinc-900 dark:text-zinc-100"
            >
              <span class="min-w-0">{{ formatOneOffLine(r) }}</span>
              <button
                type="button"
                class="shrink-0 text-xs font-medium text-zinc-600 underline-offset-2 hover:text-red-600 hover:underline dark:text-zinc-400 dark:hover:text-red-400"
                :disabled="deletingOneOffId === r.id"
                @click="removeOneOff(r.id)"
              >
                {{
                  deletingOneOffId === r.id ? "Verwijderen…" : "Verwijderen"
                }}
              </button>
            </li>
          </ul>
          <p
            v-else
            class="text-sm text-zinc-600 dark:text-zinc-400"
          >
            Voeg eenmalige data toe
          </p>
        </section>

        <section class="space-y-1">
          <div class="md:hidden">
            <TodayAddToolbarButton
              pill
              label="Wekelijks"
              @click="modalRecurOpen = true"
            />
          </div>
          <h3
            class="hidden text-xs font-semibold uppercase tracking-wide text-zinc-500 md:block dark:text-zinc-400"
          >
            Wekelijks
          </h3>
          <ul
            v-if="recurringGroups.length > 0"
            class="finbar-list-shell text-sm"
          >
            <li
              v-for="g in recurringGroups"
              :key="recurringGroupKey(g)"
              class="finbar-list-row flex flex-wrap items-center justify-between gap-2 text-zinc-900 dark:text-zinc-100"
            >
              <span class="min-w-0">{{
                formatWeekdayRecurringLabel(g.weekday, g.notes)
              }}</span>
              <button
                type="button"
                class="shrink-0 text-xs font-medium text-zinc-600 underline-offset-2 hover:text-red-600 hover:underline dark:text-zinc-400 dark:hover:text-red-400"
                :disabled="deletingRecurringKey === recurringGroupKey(g)"
                @click="removeRecurringGroup(g)"
              >
                {{
                  deletingRecurringKey === recurringGroupKey(g)
                    ? "Verwijderen…"
                    : "Verwijderen"
                }}
              </button>
            </li>
          </ul>
          <p
            v-else
            class="text-sm text-zinc-600 dark:text-zinc-400"
          >
            Voeg wekelijks toe
          </p>
        </section>

      </div>
    </template>

    <TodayModalShell v-model="modalOnceOpen">
      <h2 class="finbar-modal-title mb-4">
        Eenmalig
      </h2>
      <form
        class="space-y-4"
        @submit.prevent="addSingle"
      >
        <div>
          <span
            id="wu-period-mode-label"
            class="finbar-field-label mb-2 block"
          >Periode</span>
          <div
            class="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700"
            role="group"
            aria-labelledby="wu-period-mode-label"
          >
            <button
              type="button"
              class="min-w-0 flex-1 rounded-md px-2 py-2 text-sm font-medium transition-colors"
              :class="
                !periodMultiDay
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/80'
              "
              :aria-pressed="!periodMultiDay"
              @click="periodMultiDay = false"
            >
              Een dag
            </button>
            <button
              type="button"
              class="min-w-0 flex-1 rounded-md px-2 py-2 text-sm font-medium transition-colors"
              :class="
                periodMultiDay
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/80'
              "
              :aria-pressed="periodMultiDay"
              @click="periodMultiDay = true"
            >
              Meerdere dagen
            </button>
          </div>
        </div>
        <div
          v-if="!periodMultiDay"
          class="grid gap-3"
        >
          <div>
            <label
              class="finbar-field-label"
              for="wu-modal-from"
            >Datum</label>
            <input
              id="wu-modal-from"
              v-model="singleFrom"
              type="date"
              required
              class="finbar-field-input w-full"
              :min="minDateStr"
            >
          </div>
        </div>
        <div
          v-else
          class="grid gap-3 sm:grid-cols-2"
        >
          <div>
            <label
              class="finbar-field-label"
              for="wu-modal-from"
            >Van</label>
            <input
              id="wu-modal-from"
              v-model="singleFrom"
              type="date"
              required
              class="finbar-field-input w-full"
              :min="minDateStr"
            >
          </div>
          <div>
            <label
              class="finbar-field-label"
              for="wu-modal-to"
            >Tot</label>
            <input
              id="wu-modal-to"
              v-model="singleTo"
              type="date"
              required
              class="finbar-field-input w-full"
              :min="singleFrom || minDateStr"
            >
          </div>
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="wu-modal-notes-once"
          >Reden (optioneel)</label>
          <input
            id="wu-modal-notes-once"
            v-model="singleNotes"
            type="text"
            maxlength="10000"
            class="finbar-field-input w-full"
            :placeholder="periodMultiDay ? 'Bijv. Vakantie' : 'Bijv. Verjaardag'"
          >
        </div>
        <p
          v-if="actionError && modalOnceOpen"
          class="text-sm text-red-400"
        >
          {{ actionError }}
        </p>
        <div
          class="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"
        >
          <button
            type="submit"
            class="finbar-btn-primary-sm"
            :disabled="singlePending"
          >
            {{ singlePending ? "Opslaan…" : "Toevoegen" }}
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            :disabled="singlePending"
            @click="modalOnceOpen = false"
          >
            Annuleren
          </button>
        </div>
      </form>
    </TodayModalShell>

    <TodayModalShell v-model="modalRecurOpen">
      <h2 class="finbar-modal-title mb-4">
        Wekelijks
      </h2>
      <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Voegt vanaf vandaag voor het gekozen aantal weken telkens dezelfde
        weekdag toe (bijv. elke woensdag papadag). Onder de lijst verschijnt dit
        als vaste weekdag zodra dezelfde dag en reden minstens drie keer in de
        data staan.
      </p>
      <form
        class="space-y-4"
        @submit.prevent="addRecurring"
      >
        <div>
          <label
            class="finbar-field-label"
            for="wu-modal-weekday"
          >Weekdag</label>
          <select
            id="wu-modal-weekday"
            v-model.number="recurWeekday"
            class="finbar-field-input w-full"
          >
            <option
              v-for="w in weekdayChoices"
              :key="w.dow"
              :value="w.dow"
            >
              {{ w.label }}
            </option>
          </select>
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="wu-modal-notes-recur"
          >Reden (optioneel)</label>
          <input
            id="wu-modal-notes-recur"
            v-model="recurNotes"
            type="text"
            maxlength="10000"
            class="finbar-field-input w-full"
            placeholder="Bijv. papadag"
          >
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="wu-modal-weeks"
          >Aantal weken</label>
          <input
            id="wu-modal-weeks"
            v-model.number="recurWeeks"
            type="number"
            min="1"
            max="104"
            class="finbar-field-input w-full"
          >
        </div>
        <p
          v-if="actionError && modalRecurOpen"
          class="text-sm text-red-400"
        >
          {{ actionError }}
        </p>
        <div
          class="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"
        >
          <button
            type="submit"
            class="finbar-btn-primary-sm"
            :disabled="recurPending"
          >
            {{ recurPending ? "Bezig…" : "Toevoegen" }}
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            :disabled="recurPending"
            @click="modalRecurOpen = false"
          >
            Annuleren
          </button>
        </div>
      </form>
    </TodayModalShell>

  </component>
</template>
