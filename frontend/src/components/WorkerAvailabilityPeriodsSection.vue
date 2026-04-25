<script setup lang="ts">
import TodayAddToolbarButton from "@/components/TodayAddToolbarButton.vue";
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import { formatLocalYmd } from "@/lib/localDate";
import {
  useWorkerAvailabilityPeriodsStore,
  type WorkerAvailabilityPeriod,
} from "@/stores/workerAvailabilityPeriods";
import { computed, ref, watch } from "vue";

defineOptions({ name: "WorkerAvailabilityPeriodsSection" });

const props = defineProps<{
  workerId: string;
}>();

const store = useWorkerAvailabilityPeriodsStore();

const rows = ref<WorkerAvailabilityPeriod[]>([]);
const loading = ref(false);
const listError = ref("");
const actionError = ref("");

const modalPartTimeOpen = ref(false);
const modalFixedOpen = ref(false);

const ptFrom = ref("");
const ptTo = ref("");
const ptNotes = ref("");

const fxFrom = ref("");
const fxOpenEnded = ref(true);
const fxTo = ref("");
const fxNotes = ref("");

const formPending = ref(false);
const deletingId = ref<string | null>(null);

function longDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function lineForPeriod(p: WorkerAvailabilityPeriod): string {
  const fromL = longDate(p.dateFrom);
  if (p.kind === "FIXED_SHIFT") {
    if (p.dateTo == null) {
      return `Van ${fromL} · einddatum onbepaald`;
    }
    return p.dateFrom === p.dateTo
      ? `${fromL} · vaste dienst`
      : `Van ${fromL} t/m ${longDate(p.dateTo)} · vaste dienst`;
  }
  if (p.dateTo == null) {
    return fromL;
  }
  if (p.dateFrom === p.dateTo) {
    return `${fromL} · deeltijd`;
  }
  return `${fromL} – ${longDate(p.dateTo)} · deeltijd`;
}

function initTodayPair() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const y = formatLocalYmd(t);
  return { a: y, b: y };
}

watch(modalPartTimeOpen, (open) => {
  if (open) {
    actionError.value = "";
    const { a, b } = initTodayPair();
    ptFrom.value = a;
    ptTo.value = b;
    ptNotes.value = "";
  }
});

watch(modalFixedOpen, (open) => {
  if (open) {
    actionError.value = "";
    const { a } = initTodayPair();
    fxFrom.value = a;
    fxOpenEnded.value = true;
    fxTo.value = a;
    fxNotes.value = "";
  }
});

/** Tot / einddatum nooit vóór start: kalender begint op startdag. */
watch(ptFrom, (from) => {
  if (from && ptTo.value && ptTo.value < from) {
    ptTo.value = from;
  }
});

watch(fxFrom, (from) => {
  if (from && fxTo.value && fxTo.value < from) {
    fxTo.value = from;
  }
});

async function load() {
  loading.value = true;
  listError.value = "";
  actionError.value = "";
  try {
    rows.value = await store.fetchForWorker(props.workerId);
  } catch (e) {
    listError.value =
      e instanceof Error ? e.message : "Kon periodes niet laden";
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.workerId,
  () => {
    void load();
  },
  { immediate: true },
);

async function submitPartTime() {
  const from = ptFrom.value.trim();
  const to = ptTo.value.trim();
  if (!from || !to) {
    actionError.value = "Vul begindatum en eindatum in.";
    return;
  }
  if (from > to) {
    actionError.value = "De begindatum moet op of vóór de einddatum liggen.";
    return;
  }
  formPending.value = true;
  actionError.value = "";
  try {
    await store.createPeriod({
      workerId: props.workerId,
      dateFrom: from,
      dateTo: to,
      kind: "PART_TIME",
      notes: ptNotes.value.trim() || null,
    });
    modalPartTimeOpen.value = false;
    await load();
  } catch (e) {
    actionError.value =
      e instanceof Error ? e.message : "Kon periode niet opslaan";
  } finally {
    formPending.value = false;
  }
}

async function submitFixed() {
  const from = fxFrom.value.trim();
  if (!from) {
    actionError.value = "Kies een startdatum.";
    return;
  }
  const endYmd = fxOpenEnded.value ? null : fxTo.value.trim();
  if (!fxOpenEnded.value) {
    if (!endYmd) {
      actionError.value = "Kies een einddatum, of vink einddatum onbepaald aan.";
      return;
    }
    if (from > endYmd) {
      actionError.value =
        "De startdatum moet op of vóór de einddatum liggen.";
      return;
    }
  }
  formPending.value = true;
  actionError.value = "";
  try {
    await store.createPeriod({
      workerId: props.workerId,
      dateFrom: from,
      dateTo: endYmd,
      kind: "FIXED_SHIFT",
      notes: fxNotes.value.trim() || null,
    });
    modalFixedOpen.value = false;
    await load();
  } catch (e) {
    actionError.value =
      e instanceof Error ? e.message : "Kon niet opslaan";
  } finally {
    formPending.value = false;
  }
}

async function removeRow(id: string) {
  deletingId.value = id;
  actionError.value = "";
  try {
    await store.removePeriod(id);
    await load();
  } catch (e) {
    actionError.value =
      e instanceof Error ? e.message : "Kon periode niet verwijderen";
  } finally {
    deletingId.value = null;
  }
}

const hasRows = computed(() => rows.value.length > 0);

const hasPartTime = computed(() =>
  rows.value.some((p) => p.kind === "PART_TIME"),
);
const hasFixed = computed(() =>
  rows.value.some((p) => p.kind === "FIXED_SHIFT"),
);
/** Beide soorten tegelijk (hoort niet); gebruiker moet eerst opruimen. */
const hasMixedKinds = computed(() => hasPartTime.value && hasFixed.value);

const canAddPartTime = computed(
  () => !hasFixed.value && !hasMixedKinds.value,
);
const canAddFixed = computed(
  () => !hasPartTime.value && !hasMixedKinds.value,
);

/** Kiest welk toevoeg-modal opent. Default: deeltijd. */
const addKind = ref<"PART_TIME" | "FIXED_SHIFT">("PART_TIME");

function selectAddKind(k: "PART_TIME" | "FIXED_SHIFT") {
  if (k === "PART_TIME" && !canAddPartTime.value) {
    return;
  }
  if (k === "FIXED_SHIFT" && !canAddFixed.value) {
    return;
  }
  addKind.value = k;
}

function openAddModal() {
  if (addKind.value === "PART_TIME") {
    modalPartTimeOpen.value = true;
  } else {
    modalFixedOpen.value = true;
  }
}

const addButtonLabel = computed(() =>
  addKind.value === "PART_TIME"
    ? "Beschikbaar toevoegen"
    : "Startdatum toevoegen",
);

const titlePartTimeDisabled = computed(() => {
  if (canAddPartTime.value) {
    return undefined;
  }
  if (hasMixedKinds.value) {
    return "Er staan beide soorten. Verwijder in de lijst alles tot er één soort over is.";
  }
  return "Wil je deeltijd? Verwijder eerst de vaste dienst hieronder.";
});

const titleFixedDisabled = computed(() => {
  if (canAddFixed.value) {
    return undefined;
  }
  if (hasMixedKinds.value) {
    return "Er staan beide soorten. Verwijder in de lijst alles tot er één soort over is.";
  }
  return "Wil je vaste dienst? Verwijder eerst alle deeltijdsperiodes hieronder.";
});

watch(
  () => props.workerId,
  () => {
    addKind.value = "PART_TIME";
  },
);

watch(
  [hasPartTime, hasFixed, hasMixedKinds, loading],
  () => {
    if (loading.value) {
      return;
    }
    if (hasMixedKinds.value) {
      return;
    }
    if (hasPartTime.value && !hasFixed.value) {
      addKind.value = "PART_TIME";
    } else if (hasFixed.value && !hasPartTime.value) {
      addKind.value = "FIXED_SHIFT";
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-3">
    <p
      v-if="!loading && hasMixedKinds"
      class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
    >
      Er staan zowel deeltijd- als vaste-dienstregels. Kies één: verwijder wat
      niet hoort; daarna kun je weer toevoegen.
    </p>
    <div
      v-if="canAddPartTime || canAddFixed"
      class="flex w-full min-w-0 flex-col gap-3"
    >
      <div
        class="finbar-pill-height flex w-full min-w-0 items-stretch rounded-full border border-zinc-300 bg-zinc-100/90 p-0.5 dark:border-zinc-600 dark:bg-zinc-800/90"
        role="group"
        aria-label="Soort beschikbaarheid"
      >
        <span
          class="flex h-full min-h-0 min-w-0 flex-1"
          :title="titlePartTimeDisabled"
        >
          <button
            type="button"
            class="flex h-full w-full min-w-0 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors"
            :class="[
              addKind === 'PART_TIME'
                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500',
              canAddPartTime && addKind !== 'PART_TIME'
                ? 'hover:text-zinc-800 dark:hover:text-zinc-200'
                : '',
              !canAddPartTime ? 'cursor-not-allowed opacity-45' : '',
            ]"
            :disabled="!canAddPartTime"
            :aria-pressed="addKind === 'PART_TIME'"
            :aria-label="
              canAddPartTime
                ? undefined
                : (titlePartTimeDisabled ?? 'Deeltijd, niet beschikbaar')
            "
            @click="selectAddKind('PART_TIME')"
          >
            Deeltijd
          </button>
        </span>
        <span
          class="flex h-full min-h-0 min-w-0 flex-1"
          :title="titleFixedDisabled"
        >
          <button
            type="button"
            class="flex h-full w-full min-w-0 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors"
            :class="[
              addKind === 'FIXED_SHIFT'
                ? 'bg-white text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500',
              canAddFixed && addKind !== 'FIXED_SHIFT'
                ? 'hover:text-zinc-800 dark:hover:text-zinc-200'
                : '',
              !canAddFixed ? 'cursor-not-allowed opacity-45' : '',
            ]"
            :disabled="!canAddFixed"
            :aria-pressed="addKind === 'FIXED_SHIFT'"
            :aria-label="
              canAddFixed
                ? undefined
                : (titleFixedDisabled ?? 'Vaste dienst, niet beschikbaar')
            "
            @click="selectAddKind('FIXED_SHIFT')"
          >
            Vaste dienst
          </button>
        </span>
      </div>
      <div class="w-full min-w-0">
        <TodayAddToolbarButton
          pill
          full-width
          :label="addButtonLabel"
          @click="openAddModal"
        />
      </div>
    </div>

    <p
      v-if="loading"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>
    <p
      v-else-if="listError"
      class="text-sm text-red-400"
    >
      {{ listError }}
    </p>
    <template v-else>
      <p
        v-if="actionError"
        class="text-sm text-red-400"
      >
        {{ actionError }}
      </p>
      <ul
        v-if="hasRows"
        class="finbar-list-shell text-sm"
      >
        <li
          v-for="p in rows"
          :key="p.id"
          class="finbar-list-row flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0 text-zinc-900 dark:text-zinc-100">
            <span class="font-medium">{{ lineForPeriod(p) }}</span>
            <span
              v-if="(p.notes ?? '').trim()"
              class="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-500"
            >{{ p.notes }}</span>
          </div>
          <button
            type="button"
            class="shrink-0 self-end text-xs font-medium text-zinc-600 underline-offset-2 hover:text-red-600 hover:underline dark:text-zinc-400 sm:self-auto dark:hover:text-red-400"
            :disabled="deletingId === p.id"
            @click="removeRow(p.id)"
          >
            {{ deletingId === p.id ? "Verwijderen…" : "Verwijderen" }}
          </button>
        </li>
      </ul>
    </template>

    <TodayModalShell v-model="modalPartTimeOpen">
      <h2 class="finbar-modal-title mb-1">
        Deeltijdsperiode
      </h2>
      <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Eén tijdsvenster; je kunt meerdere periodes toevoegen (bijv. mei en
        daarna juni).
      </p>
      <form
        class="space-y-4"
        @submit.prevent="submitPartTime"
      >
        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              class="finbar-field-label"
              for="wap-pt-from"
            >Van</label>
            <input
              id="wap-pt-from"
              v-model="ptFrom"
              type="date"
              required
              class="finbar-field-input w-full"
            >
          </div>
          <div>
            <label
              class="finbar-field-label"
              for="wap-pt-to"
            >Tot</label>
            <input
              id="wap-pt-to"
              v-model="ptTo"
              type="date"
              required
              :min="ptFrom || undefined"
              class="finbar-field-input w-full"
            >
          </div>
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="wap-pt-notes"
          >Toelichting (optioneel)</label>
          <input
            id="wap-pt-notes"
            v-model="ptNotes"
            type="text"
            maxlength="10000"
            class="finbar-field-input w-full"
            placeholder="Bijv. alleen ochtenden"
          >
        </div>
        <p
          v-if="actionError && modalPartTimeOpen"
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
            :disabled="formPending"
          >
            {{ formPending ? "Opslaan…" : "Toevoegen" }}
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            :disabled="formPending"
            @click="modalPartTimeOpen = false"
          >
            Annuleren
          </button>
        </div>
      </form>
    </TodayModalShell>

    <TodayModalShell v-model="modalFixedOpen">
      <h2 class="finbar-modal-title mb-1">
        Vaste dienst
      </h2>
      <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Startdatum is verplicht. Einddatum is optioneel (onbepaald) of tot een
        vaste einddatum.
      </p>
      <form
        class="space-y-4"
        @submit.prevent="submitFixed"
      >
        <div>
          <label
            class="finbar-field-label"
            for="wap-fx-from"
          >Startdatum</label>
          <input
            id="wap-fx-from"
            v-model="fxFrom"
            type="date"
            required
            class="finbar-field-input w-full"
          >
        </div>
        <div class="space-y-2">
          <label class="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
            <input
              v-model="fxOpenEnded"
              type="checkbox"
              class="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600"
            >
            Einddatum onbepaald
          </label>
        </div>
        <div v-if="!fxOpenEnded">
          <label
            class="finbar-field-label"
            for="wap-fx-to"
          >Einddatum</label>
          <input
            id="wap-fx-to"
            v-model="fxTo"
            type="date"
            :min="fxFrom || undefined"
            class="finbar-field-input w-full"
          >
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="wap-fx-notes"
          >Toelichting (optioneel)</label>
          <input
            id="wap-fx-notes"
            v-model="fxNotes"
            type="text"
            maxlength="10000"
            class="finbar-field-input w-full"
          >
        </div>
        <p
          v-if="actionError && modalFixedOpen"
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
            :disabled="formPending"
          >
            {{ formPending ? "Opslaan…" : "Toevoegen" }}
          </button>
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            :disabled="formPending"
            @click="modalFixedOpen = false"
          >
            Annuleren
          </button>
        </div>
      </form>
    </TodayModalShell>
  </div>
</template>
