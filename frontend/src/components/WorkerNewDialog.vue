<script setup lang="ts">
import TodayModalShell from "@/components/ui/TodayModalShell.vue";
import WorkerNewForm from "@/components/WorkerNewForm.vue";
import type { Worker } from "@/stores/workers";
import { ref, watch } from "vue";

defineOptions({ name: "WorkerNewDialog" });

const open = defineModel<boolean>({ default: false });

const emit = defineEmits<{
  created: [worker: Worker];
}>();

const formKey = ref(0);

watch(
  () => open.value,
  (v) => {
    if (v) {
      formKey.value += 1;
    }
  },
);

function onSuccess(w: Worker) {
  open.value = false;
  emit("created", w);
}
</script>

<template>
  <TodayModalShell v-model="open">
    <div class="flex min-h-0 flex-col">
      <h2
        class="finbar-modal-title mb-4 shrink-0"
      >
        Nieuwe relatie toevoegen aan netwerk
      </h2>
      <div class="min-h-0 overflow-y-auto pr-0.5">
        <WorkerNewForm
          :key="formKey"
          @success="onSuccess"
        />
      </div>
    </div>
  </TodayModalShell>
</template>
