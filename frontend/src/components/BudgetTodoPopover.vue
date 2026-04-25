<script setup lang="ts">
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import {
  createBudgetTodo,
  deleteBudgetTodo,
  updateBudgetTodo,
  type BudgetPhaseDto,
  type BudgetTodoDto,
} from "@/lib/budgetApi";
import { computed, ref, watch } from "vue";

defineOptions({ name: "BudgetTodoPopover" });

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  saved: [];
}>();

const modalOpen = ref(false);
const mode = ref<"create" | "edit">("create");
const phaseId = ref<string | null>(null);
const phaseName = ref("");
const editingTodoId = ref<string | null>(null);

const title = ref("");
const hours = ref("0");
const hourlyRate = ref("0");
const materials = ref("");
const materialCost = ref("0");

const pending = ref(false);
const deletePending = ref(false);
const formError = ref("");

const heading = computed(() =>
  mode.value === "edit" ? "ToDo bewerken" : "ToDo toevoegen",
);

function resetForm() {
  formError.value = "";
  title.value = "";
  hours.value = "0";
  hourlyRate.value = "0";
  materials.value = "";
  materialCost.value = "0";
  mode.value = "create";
  phaseId.value = null;
  phaseName.value = "";
  editingTodoId.value = null;
}

watch(modalOpen, (v) => {
  if (!v) {
    resetForm();
  }
});

function close() {
  modalOpen.value = false;
}

function openCreate(pId: string, pName: string) {
  mode.value = "create";
  editingTodoId.value = null;
  formError.value = "";
  title.value = "";
  hours.value = "0";
  hourlyRate.value = "0";
  materials.value = "";
  materialCost.value = "0";
  phaseId.value = pId;
  phaseName.value = pName;
  modalOpen.value = true;
}

function openEdit(phase: BudgetPhaseDto, t: BudgetTodoDto) {
  mode.value = "edit";
  phaseId.value = phase.id;
  phaseName.value = phase.name;
  editingTodoId.value = t.id;
  title.value = t.title;
  hours.value = t.hours;
  hourlyRate.value = t.hourlyRate;
  materials.value = t.materialsDescription ?? "";
  materialCost.value = t.materialCost;
  formError.value = "";
  modalOpen.value = true;
}

defineExpose({ openCreate, openEdit, close });

function parseMoney(s: string): number {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

async function submit() {
  const t = title.value.trim();
  if (!t) {
    formError.value = "Vul een omschrijving in";
    return;
  }
  const pId = phaseId.value;
  if (!pId) {
    formError.value = "Geen fase";
    return;
  }
  pending.value = true;
  formError.value = "";
  const payload = {
    title: t,
    hours: parseMoney(hours.value),
    hourlyRate: parseMoney(hourlyRate.value),
    materialsDescription: materials.value.trim() || null,
    materialCost: parseMoney(materialCost.value),
  };
  try {
    if (mode.value === "edit" && editingTodoId.value) {
      await updateBudgetTodo(props.projectId, editingTodoId.value, payload);
    } else {
      await createBudgetTodo(props.projectId, pId, payload);
    }
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
  if (!editingTodoId.value) return;
  deletePending.value = true;
  formError.value = "";
  try {
    await deleteBudgetTodo(props.projectId, editingTodoId.value);
    emit("saved");
    close();
  } catch (e) {
    formError.value =
      e instanceof Error ? e.message : "Verwijderen mislukt";
  } finally {
    deletePending.value = false;
  }
}
</script>

<template>
  <TodayModalShell v-model="modalOpen">
    <h2 class="finbar-modal-title">
      {{ heading }}
    </h2>
    <p
      v-if="phaseName"
      class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400"
    >
      Fase: {{ phaseName }}
    </p>
    <form
      class="mt-4 space-y-3"
      @submit.prevent="submit"
    >
      <div>
        <label
          class="finbar-field-label"
          for="budget-todo-title"
        >Omschrijving</label>
        <input
          id="budget-todo-title"
          v-model="title"
          type="text"
          required
          maxlength="500"
          class="finbar-field-input"
          placeholder="Bijv. Tegelwerk wand"
        >
      </div>
      <div
        class="grid gap-3 sm:grid-cols-2"
      >
        <div>
          <label
            class="finbar-field-label"
            for="budget-todo-h"
          >Uren</label>
          <input
            id="budget-todo-h"
            v-model="hours"
            type="text"
            inputmode="decimal"
            class="finbar-field-input"
            placeholder="0"
          >
        </div>
        <div>
          <label
            class="finbar-field-label"
            for="budget-todo-rate"
          >Uurloon (€) — toevoegen aan arbeid</label>
          <input
            id="budget-todo-rate"
            v-model="hourlyRate"
            type="text"
            inputmode="decimal"
            class="finbar-field-input"
            placeholder="0"
          >
        </div>
      </div>
      <div>
        <label
          class="finbar-field-label"
          for="budget-todo-mat"
        >Materialen</label>
        <textarea
          id="budget-todo-mat"
          v-model="materials"
          rows="2"
          maxlength="10000"
          class="finbar-field-input"
          placeholder="Bijv. 12 m² tegels, lijm"
        />
      </div>
      <div>
        <label
          class="finbar-field-label"
          for="budget-todo-mcost"
        >Kosten materialen (€)</label>
        <input
          id="budget-todo-mcost"
          v-model="materialCost"
          type="text"
          inputmode="decimal"
          class="finbar-field-input"
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
          v-if="mode === 'edit'"
          type="button"
          class="shrink-0 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/80 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
          :disabled="pending || deletePending"
          @click="onDelete"
        >
          {{ deletePending ? "Bezig…" : "ToDo verwijderen" }}
        </button>
      </div>
    </form>
  </TodayModalShell>
</template>
