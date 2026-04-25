<script setup lang="ts">
import WorkerEditDialog from "@/components/WorkerEditDialog.vue";
import { useWorkersStore } from "@/stores/workers";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

defineOptions({ name: "WorkerDetailView" });

const props = defineProps<{
  id: string;
}>();

const route = useRoute();
const router = useRouter();
const workers = useWorkersStore();

const open = ref(true);

const workersListLocation = computed(() =>
  route.name === "global-worker-detail"
    ? { name: "global-workers" as const }
    : {
        name: "project-workers" as const,
        params: { projectId: route.params.projectId as string },
      },
);

const variant = computed(() =>
  route.name === "global-worker-detail" ? "global" : "project",
);

const projectId = computed(() =>
  route.name === "project-worker-detail"
    ? (route.params.projectId as string)
    : undefined,
);

watch(open, (v) => {
  if (!v) {
    void router.push(workersListLocation.value);
  }
});

watch(
  () => props.id,
  () => {
    open.value = true;
  },
);

async function onUpdated() {
  await workers.fetchList();
}
</script>

<template>
  <WorkerEditDialog
    v-model="open"
    :worker-id="id"
    :variant="variant"
    :project-id="projectId"
    @updated="onUpdated"
  />
</template>
