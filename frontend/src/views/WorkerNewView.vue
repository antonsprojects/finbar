<script setup lang="ts">
import WorkerNewForm from "@/components/WorkerNewForm.vue";
import type { Worker } from "@/stores/workers";
import { computed } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

defineOptions({ name: "WorkerNewView" });

const route = useRoute();
const projectId = computed(() => route.params.projectId as string);
const isGlobalWorkersFlow = computed(
  () => route.name === "global-worker-new",
);

const router = useRouter();

function onSuccess(w: Worker) {
  if (isGlobalWorkersFlow.value) {
    void router.push({
      name: "global-worker-detail",
      params: { id: w.id },
    });
  } else {
    void router.push({
      name: "project-worker-detail",
      params: { projectId: projectId.value, id: w.id },
    });
  }
}
</script>

<template>
  <div
    class="mx-auto max-w-lg space-y-4 bg-zinc-50 dark:bg-zinc-950"
  >
    <div class="flex items-center gap-3">
      <RouterLink
        :to="
          isGlobalWorkersFlow
            ? { name: 'global-workers' }
            : { name: 'project-team-pick', params: { projectId } }
        "
        class="finbar-link-back"
      >
        {{ isGlobalWorkersFlow ? "← Netwerk" : "← Teamlid toevoegen" }}
      </RouterLink>
    </div>
    <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">
      Nieuwe relatie toevoegen aan netwerk
    </h1>

    <WorkerNewForm @success="onSuccess" />
  </div>
</template>
