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

const ptFrom = ref("");
const ptTo = ref("");

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
  if (p.dateTo == null) {
    return `${fromL} · deeltijd`;
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
  }
});

/** Tot / einddatum nooit vóór start: kalender begint op startdag. */
watch(ptFrom, (from) => {
  if (from && ptTo.value && ptTo.value < from) {
    ptTo.value = from;
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
      notes: null,
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

function openAddModal() {
  modalPartTimeOpen.value = true;
}
</script>

<template>
  <div class="space-y-3">
    <div class="w-full min-w-0">
      <TodayAddToolbarButton
        pill
        full-width
          label="Beschikbaarheid toevoegen"
        @click="openAddModal"
      />
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
        Beschikbaarheid toevoegen
      </h2>
      <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Je kan meerdere blokken toevoegen. Bijvoorbeeld van 6 maart tot 2 april
        en daarna van 1 juni tot 7 juni.
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

  </div>
</template>
