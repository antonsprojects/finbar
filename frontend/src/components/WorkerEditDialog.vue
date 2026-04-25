<script setup lang="ts">
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import WorkerDetailBody from "@/components/WorkerDetailBody.vue";
import { computed } from "vue";

defineOptions({ name: "WorkerEditDialog" });

const open = defineModel<boolean>({ default: false });

const props = defineProps<{
  /** Zet op `null` wanneer het venster dicht is. */
  workerId: string | null;
  variant: "global" | "project";
  /** Voor `variant="project"`: huidig project. */
  projectId?: string;
}>();

const emit = defineEmits<{
  updated: [];
}>();

/** Niet `title` noemen — kan in sjabloon/attrs schaduwen. */
const modalTitle = computed(() =>
  props.variant === "global" ? "Relatie" : "Teamlid",
);

const effectiveProjectId = computed(() =>
  props.variant === "project" ? props.projectId : undefined,
);

function onBodyUpdated() {
  emit("updated");
}
</script>

<template>
  <TodayModalShell
    v-model="open"
    wide
    internal-scroll
  >
    <WorkerDetailBody
      v-if="workerId"
      :key="workerId"
      :head-title="modalTitle"
      :worker-id="workerId"
      :project-id="effectiveProjectId"
      @updated="onBodyUpdated"
    />
  </TodayModalShell>
</template>
