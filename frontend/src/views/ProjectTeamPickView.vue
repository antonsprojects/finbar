<script setup lang="ts">
import ProjectTeamAddPanel from "@/components/ProjectTeamAddPanel.vue";
import { useJobsStore } from "@/stores/jobs";
import { computed, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

defineOptions({ name: "ProjectTeamPickView" });

const route = useRoute();
const router = useRouter();
const jobs = useJobsStore();
const projectId = computed(() => route.params.projectId as string);
const projectTitle = computed(
  () => jobs.detailById[projectId.value]?.name?.trim() || "dit project",
);

const teamPanel = ref<{
  save: () => Promise<void>;
  resetStaged: () => void;
} | null>(null);
const saveBusy = ref(false);

async function onSave() {
  const p = teamPanel.value;
  if (!p) return;
  saveBusy.value = true;
  try {
    await p.save();
  } catch {
    return;
  } finally {
    saveBusy.value = false;
  }
  await router.push({
    name: "project-workers",
    params: { projectId: projectId.value },
  });
}
</script>

<template>
  <div class="space-y-4 bg-zinc-50 dark:bg-zinc-950">
    <div class="flex items-center gap-3">
      <RouterLink
        :to="{ name: 'project-workers', params: { projectId } }"
        class="finbar-link-back"
      >
        ← Team
      </RouterLink>
    </div>

    <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">
      Teamlid toevoegen aan {{ projectTitle }} vanuit netwerk
    </h1>

    <ProjectTeamAddPanel
      ref="teamPanel"
      :project-id="projectId"
    />

    <div class="flex flex-wrap gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <button
        type="button"
        class="finbar-btn-primary-sm"
        :disabled="saveBusy"
        @click="onSave"
      >
        {{ saveBusy ? "Bezig…" : "Opslaan" }}
      </button>
      <RouterLink
        :to="{ name: 'project-workers', params: { projectId } }"
        class="inline-flex items-center rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        :class="saveBusy ? 'pointer-events-none opacity-50' : ''"
      >
        Annuleren
      </RouterLink>
    </div>
  </div>
</template>
