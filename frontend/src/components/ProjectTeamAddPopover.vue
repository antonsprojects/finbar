<script setup lang="ts">
import ProjectTeamAddPanel from "@/components/ProjectTeamAddPanel.vue";
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import { useJobsStore } from "@/stores/jobs";
import { computed, ref } from "vue";

defineOptions({ name: "ProjectTeamAddPopover" });

const props = defineProps<{
  projectId: string;
  /** Team-flow: opnieuw openen; lijst scrollt naar dit contact. */
  revealWorkerId?: string | null;
}>();

const jobs = useJobsStore();
const projectTitle = computed(
  () =>
    jobs.detailById[props.projectId]?.name?.trim() || "dit project",
);

const open = defineModel<boolean>({ default: false });

const emit = defineEmits<{
  updated: [];
  "open-new-contact": [];
  "reveal-worker-applied": [];
}>();

const panelRef = ref<InstanceType<typeof ProjectTeamAddPanel> | null>(null);
const saveBusy = ref(false);

function onPanelUpdated() {
  emit("updated");
}

async function onSave() {
  if (!open.value) return;
  const panel = panelRef.value;
  if (!panel) {
    open.value = false;
    return;
  }
  saveBusy.value = true;
  try {
    await panel.save();
  } catch {
    /* fout staat in het paneel */
    return;
  } finally {
    saveBusy.value = false;
  }
  open.value = false;
}

function onCancel() {
  panelRef.value?.resetStaged();
  open.value = false;
}

function onAddContacts() {
  emit("open-new-contact");
}
</script>

<template>
  <TodayModalShell v-model="open">
    <div class="flex min-h-0 flex-col">
      <h2 class="finbar-modal-title mb-4 shrink-0">
        Teamlid toevoegen aan {{ projectTitle }} vanuit netwerk
      </h2>
      <div class="min-h-0 overflow-x-hidden pr-0.5">
        <ProjectTeamAddPanel
          v-if="open"
          ref="panelRef"
          :project-id="projectId"
          :reveal-worker-id="revealWorkerId"
          @team-updated="onPanelUpdated"
          @reveal-worker-done="emit('reveal-worker-applied')"
        />
      </div>
      <div
        class="mt-0 flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 dark:border-zinc-800"
      >
        <div
          class="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:gap-2"
        >
          <button
            type="button"
            class="finbar-btn-primary-sm min-w-0 justify-center"
            :disabled="saveBusy"
            @click="onSave"
          >
            {{ saveBusy ? "Bezig…" : "Opslaan" }}
          </button>
          <button
            type="button"
            class="rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-800 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 sm:border-0 sm:bg-transparent sm:px-3 sm:py-1.5 sm:text-zinc-600 sm:hover:bg-zinc-100 sm:dark:hover:bg-zinc-800"
            :disabled="saveBusy"
            @click="onCancel"
          >
            Annuleren
          </button>
        </div>
        <button
          type="button"
          class="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto sm:shrink-0 sm:py-1.5"
          :disabled="saveBusy"
          @click="onAddContacts"
        >
          Nieuwe relatie toevoegen aan netwerk
        </button>
      </div>
    </div>
  </TodayModalShell>
</template>
