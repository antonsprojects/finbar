<script setup lang="ts">
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import {
  deletePhase,
  updatePhase,
  type BudgetPhaseDto,
} from "@/lib/budgetApi";
import { ref, watch } from "vue";

defineOptions({ name: "BudgetPhaseEditPopover" });

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const modalOpen = ref(false);
const phaseId = ref<string | null>(null);
const name = ref("");
const pending = ref(false);
const deletePending = ref(false);
const formError = ref("");

function reset() {
  formError.value = "";
  name.value = "";
  phaseId.value = null;
}

watch(modalOpen, (v) => {
  if (!v) {
    reset();
  }
});

function close() {
  modalOpen.value = false;
}

function open(phase: BudgetPhaseDto) {
  formError.value = "";
  phaseId.value = phase.id;
  name.value = phase.name;
  modalOpen.value = true;
}

defineExpose({ open, close });

async function submit() {
  const n = name.value.trim();
  if (!n) {
    formError.value = "Vul een fasenaam in";
    return;
  }
  const id = phaseId.value;
  if (!id) {
    formError.value = "Geen fase";
    return;
  }
  pending.value = true;
  formError.value = "";
  try {
    await updatePhase(props.projectId, id, { name: n });
    emit("saved");
    close();
  } catch (e) {
    formError.value =
      e instanceof Error ? e.message : "Opslaan is mislukt";
  } finally {
    pending.value = false;
  }
}

async function onDelete() {
  const id = phaseId.value;
  if (!id) return;
  const n = name.value.trim() || "deze fase";
  if (
    !confirm(
      `Fase “${n}” en alle taken in die fase verwijderen? Dit kan niet ongedaan worden gemaakt.`,
    )
  ) {
    return;
  }
  deletePending.value = true;
  formError.value = "";
  try {
    await deletePhase(props.projectId, id);
    emit("saved");
    close();
  } catch (e) {
    formError.value =
      e instanceof Error ? e.message : "Verwijderen is mislukt";
  } finally {
    deletePending.value = false;
  }
}
</script>

<template>
  <TodayModalShell v-model="modalOpen">
    <h2 class="finbar-modal-title">
      Fase bewerken
    </h2>
    <form
      class="mt-4 space-y-3"
      @submit.prevent="submit"
    >
      <div>
        <label
          class="finbar-field-label"
          for="budget-phase-name"
        >Naam</label>
        <input
          id="budget-phase-name"
          v-model="name"
          type="text"
          required
          maxlength="200"
          class="finbar-field-input"
          placeholder="Bijv. Badkamer, Keuken"
        >
      </div>
      <p
        v-if="formError"
        class="text-sm text-red-400"
      >
        {{ formError }}
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
          @click="onDelete"
        >
          {{ deletePending ? "Bezig…" : "Fase verwijderen" }}
        </button>
      </div>
    </form>
  </TodayModalShell>
</template>
