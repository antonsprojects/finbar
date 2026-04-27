<script setup lang="ts">
import BudgetPhaseEditPopover from "@/components/BudgetPhaseEditPopover.vue";
import BudgetTodoPopover from "@/components/BudgetTodoPopover.vue";
import TodayAddToolbarButton from "@/components/TodayAddToolbarButton.vue";
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import {
  createPhase,
  fetchBegroting,
  formatEur,
  type BudgetPhaseDto,
  type BudgetTodoDto,
  parseNum,
} from "@/lib/budgetApi";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

defineOptions({ name: "ProjectBudgetView" });

const route = useRoute();
const projectId = computed(() => route.params.projectId as string);

const todoPopRef = ref<{
  openCreate: (phaseId: string, phaseName: string) => void;
  openEdit: (phase: BudgetPhaseDto, t: BudgetTodoDto) => void;
} | null>(null);

const phaseEditPopRef = ref<{
  open: (phase: BudgetPhaseDto) => void;
} | null>(null);

const phases = ref<BudgetPhaseDto[]>([]);
const loading = ref(true);
const error = ref("");

const newPhaseName = ref("");
const creatingPhase = ref(false);
const phaseDialogOpen = ref(false);
const phaseFormError = ref("");

function openPhaseDialog() {
  phaseFormError.value = "";
  newPhaseName.value = "";
  phaseDialogOpen.value = true;
}

function closePhaseDialog() {
  phaseDialogOpen.value = false;
}

function laborEur(t: BudgetTodoDto): number {
  return parseNum(t.hours) * parseNum(t.hourlyRate);
}

function lineTotalEur(t: BudgetTodoDto): number {
  return laborEur(t) + parseNum(t.materialCost);
}

function phaseTotal(phase: BudgetPhaseDto): number {
  return phase.todos.reduce((s, t) => s + lineTotalEur(t), 0);
}

const projectTotalEur = computed(() =>
  phases.value.reduce((s, p) => s + phaseTotal(p), 0),
);

async function load() {
  error.value = "";
  loading.value = true;
  try {
    phases.value = await fetchBegroting(projectId.value);
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : "Kon begroting niet laden";
  } finally {
    loading.value = false;
  }
}

async function onAddPhase() {
  const name = newPhaseName.value.trim();
  if (!name) {
    phaseFormError.value = "Vul een fasenaam in";
    return;
  }
  creatingPhase.value = true;
  phaseFormError.value = "";
  try {
    const p = await createPhase(projectId.value, name);
    newPhaseName.value = "";
    closePhaseDialog();
    phases.value = [...phases.value, p].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
  } catch (e) {
    phaseFormError.value =
      e instanceof Error ? e.message : "Fase kon niet worden toegevoegd";
  } finally {
    creatingPhase.value = false;
  }
}

function openPhaseEdit(phase: BudgetPhaseDto) {
  phaseEditPopRef.value?.open(phase);
}

function openTodoCreate(phase: BudgetPhaseDto) {
  todoPopRef.value?.openCreate(phase.id, phase.name);
}

function openTodoEdit(phase: BudgetPhaseDto, t: BudgetTodoDto) {
  todoPopRef.value?.openEdit(phase, t);
}

onMounted(() => {
  void load();
});

watch(projectId, () => {
  void load();
});
</script>

<template>
  <div class="space-y-3">
    <p
      v-if="loading"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>

    <article
      v-else
      class="finbar-page-article-shell"
    >
      <BudgetPhaseEditPopover
        ref="phaseEditPopRef"
        :project-id="projectId"
        @saved="load"
      />
      <BudgetTodoPopover
        ref="todoPopRef"
        :project-id="projectId"
        @saved="load"
      />

      <TodayModalShell
        v-model="phaseDialogOpen"
        compact
      >
        <h2
          class="finbar-modal-title !text-base"
        >
          Fase toevoegen
        </h2>
        <p
          class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400"
        >
          Een fase groepeert taken in je begroting, bijv. per ruimte of
          werkpakket.
        </p>
        <form
          class="mt-4 space-y-3"
          @submit.prevent="onAddPhase"
        >
          <div>
            <label
              class="finbar-field-label"
              for="budget-new-phase"
            >Fasenaam</label>
            <input
              id="budget-new-phase"
              v-model="newPhaseName"
              type="text"
              class="finbar-field-input"
              placeholder="Bijv. Badkamer, Keuken, Vloer"
              maxlength="200"
              autofocus
            >
          </div>
          <p
            v-if="phaseFormError"
            class="text-sm text-red-500"
          >
            {{ phaseFormError }}
          </p>
          <div class="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="submit"
              class="finbar-btn-primary-sm"
              :disabled="creatingPhase"
            >
              {{ creatingPhase ? "Bezig…" : "Toevoegen" }}
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              :disabled="creatingPhase"
              @click="closePhaseDialog"
            >
              Annuleren
            </button>
          </div>
        </form>
      </TodayModalShell>

      <header
        class="border-b border-zinc-200/90 pb-2 dark:border-zinc-700/80"
      >
        <div
          class="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-3 md:gap-y-2"
        >
          <div class="hidden min-w-0 px-0.5 md:block">
            <h1
              class="text-base font-semibold text-zinc-900 dark:text-white"
            >
              Begroting
            </h1>
          </div>
          <div
            :class="[
              'w-full min-w-0 shrink-0',
              'max-md:flex max-md:items-end max-md:gap-2',
              phases.length ? 'max-md:justify-between' : 'max-md:justify-end',
              'md:flex md:w-auto md:items-center md:justify-end md:gap-2',
            ]"
          >
            <div
              v-if="phases.length"
              class="min-w-0 grow text-left max-md:min-w-0 md:shrink-0 md:text-right"
            >
              <p
                class="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
              >
                Totaal
              </p>
              <p
                class="text-base font-semibold tabular-nums text-zinc-900 dark:text-white"
              >
                {{ formatEur(projectTotalEur) }}
              </p>
            </div>
            <div
              :class="[
                'min-w-0 shrink-0',
                'max-md:max-w-[12.5rem]',
                'md:max-w-none',
                'md:shrink-0',
                '[&>button]:md:!w-auto',
              ]"
            >
              <TodayAddToolbarButton
                pill
                full-width
                mobile-add-toolbar-layout
                label="Fase toevoegen"
                label-narrow="Fase"
                accessibility-label="Fase toevoegen"
                @click="openPhaseDialog"
              />
            </div>
          </div>
        </div>

        <p
          v-if="error"
          class="mt-2 text-sm text-red-500"
        >
          {{ error }}
        </p>
      </header>

      <div class="mt-0 space-y-3 finbar-inset-bleed sm:mt-2.5">
        <p
          v-if="!phases.length"
          class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
        >
          Begrotingen bestaan uit verschillende fases, zoals slopen of muren
          plaatsen. Voor iedere fase kun je taken aanmaken, zoals “plafond
          verwijderen” of “afval afvoeren”.
          <br>
          <button
            type="button"
            class="mt-2 text-zinc-800 underline decoration-zinc-400 underline-offset-2 dark:text-zinc-200"
            @click="openPhaseDialog"
          >
            Voeg de eerste fase toe aan dit project.
          </button>
        </p>

        <div
          v-for="phase in phases"
          :key="phase.id"
          class="space-y-2 rounded-md border border-zinc-200/95 bg-white/90 p-3 max-sm:-mx-3 max-sm:rounded-none max-sm:border-0 dark:border-zinc-600/80 dark:bg-zinc-900/45"
        >
          <div
            class="flex flex-wrap items-center justify-between gap-2"
          >
            <div
              class="min-w-0 flex-1 max-md:flex max-md:flex-col max-md:gap-0"
            >
              <button
                type="button"
                :title="`Fase bewerken: ${phase.name}`"
                class="inline-flex cursor-pointer -mx-0.5 max-w-full items-center gap-1.5 rounded-md px-0.5 py-0.5 text-left text-base font-bold uppercase tracking-wide text-zinc-900 transition-colors hover:bg-zinc-100/70 hover:text-zinc-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 max-md:py-0 max-md:leading-tight dark:text-zinc-100 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                @click="openPhaseEdit(phase)"
              >
                <span class="min-w-0 break-words">{{ phase.name }}</span>
                <svg
                  class="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <p
                v-if="phase.todos.length"
                class="text-sm tabular-nums text-zinc-600 max-md:mt-0 max-md:leading-tight dark:text-zinc-500"
              >
                {{ formatEur(phaseTotal(phase)) }}
              </p>
            </div>
            <div
              :class="[
                'flex min-w-0 flex-wrap items-center justify-end gap-2',
                'shrink-0',
                'max-md:max-w-[12.5rem]',
                'md:max-w-none',
                'md:shrink-0',
                '[&>button]:md:!w-auto',
              ]"
            >
              <TodayAddToolbarButton
                pill
                full-width
                mobile-add-toolbar-layout
                label="Taak toevoegen"
                label-narrow="Taak"
                accessibility-label="Taak toevoegen"
                @click="openTodoCreate(phase)"
              />
            </div>
          </div>

          <div
            v-if="phase.todos.length"
            class="overflow-x-auto rounded-md border border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900/40"
          >
            <table
              class="w-full min-w-[32rem] border-collapse text-left text-sm"
            >
              <thead>
                <tr
                  class="border-b border-zinc-200 bg-zinc-50/90 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-400"
                >
                  <th class="px-3 py-2 text-left text-xs font-medium">
                    Taak
                  </th>
                  <th
                    class="w-16 px-2 py-2 text-left text-xs font-medium"
                  >
                    Uren
                  </th>
                  <th
                    class="w-24 px-2 py-2 text-left text-xs font-medium"
                  >
                    Uurloon
                  </th>
                  <th
                    class="w-24 px-2 py-2 text-right text-xs font-medium"
                  >
                    Arbeid
                  </th>
                  <th
                    class="min-w-[7rem] px-2 py-2 text-left text-xs font-medium"
                  >
                    Materialen
                  </th>
                  <th
                    class="w-24 px-2 py-2 text-right text-xs font-medium"
                  >
                    Kosten
                  </th>
                  <th
                    class="w-24 px-2 py-2 text-right text-xs font-medium"
                  >
                    Totaal
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="t in phase.todos"
                  :key="t.id"
                  class="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50/80 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                  role="button"
                  tabindex="0"
                  @click="openTodoEdit(phase, t)"
                  @keydown.enter.prevent="openTodoEdit(phase, t)"
                >
                  <td
                    class="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {{ t.title }}
                  </td>
                  <td class="px-2 py-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                    {{ t.hours }}
                  </td>
                  <td class="px-2 py-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                    {{ formatEur(parseNum(t.hourlyRate)) }}
                  </td>
                  <td class="px-2 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {{ formatEur(laborEur(t)) }}
                  </td>
                  <td
                    class="max-w-[10rem] truncate px-2 py-2 text-zinc-600 dark:text-zinc-400"
                    :title="t.materialsDescription || undefined"
                  >
                    {{ t.materialsDescription || "—" }}
                  </td>
                  <td class="px-2 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {{ formatEur(parseNum(t.materialCost)) }}
                  </td>
                  <td
                    class="px-2 py-2 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100"
                  >
                    {{ formatEur(lineTotalEur(t)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p
            v-else
            class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400"
          >
            Voeg een eerste taak toe aan de fase {{ phase.name.toLowerCase() }}.
          </p>
        </div>
      </div>
    </article>
  </div>
</template>
