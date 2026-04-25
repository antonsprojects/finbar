<script setup lang="ts">
import WorkerTradeInput from "@/components/WorkerTradeInput.vue";
import type { Worker } from "@/stores/workers";
import { useWorkersStore } from "@/stores/workers";
import { computed, onMounted, ref } from "vue";

defineOptions({ name: "WorkerNewForm" });

const emit = defineEmits<{
  success: [worker: Worker];
}>();

const workers = useWorkersStore();

const firstName = ref("");
const lastName = ref("");
const trade = ref("");
const notes = ref("");
const error = ref("");
const loading = ref(false);

const tradeSuggestions = computed(() => workers.networkTradeSuggestions());

onMounted(() => {
  void workers.fetchList();
});

async function onSubmit() {
  error.value = "";
  loading.value = true;
  try {
    const w = await workers.createWorker({
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      trade: trade.value.trim() || null,
      notes: notes.value.trim() || null,
    });
    emit("success", w);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Kon teamlid niet aanmaken";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <form
    class="space-y-3"
    @submit.prevent="onSubmit"
  >
    <div class="grid gap-3 sm:grid-cols-2">
      <div>
        <label
          class="finbar-field-label"
          for="wn-first"
        >Voornaam</label>
        <input
          id="wn-first"
          v-model="firstName"
          type="text"
          required
          maxlength="200"
          class="finbar-field-input"
          autocomplete="given-name"
        >
      </div>
      <div>
        <label
          class="finbar-field-label"
          for="wn-last"
        >Achternaam</label>
        <input
          id="wn-last"
          v-model="lastName"
          type="text"
          maxlength="200"
          class="finbar-field-input"
          autocomplete="family-name"
        >
      </div>
    </div>
    <WorkerTradeInput
      v-model="trade"
      input-id="wn-trade"
      :suggestions="tradeSuggestions"
    />
    <div>
      <label
        class="finbar-field-label"
        for="wn-notes"
      >Notities</label>
      <textarea
        id="wn-notes"
        v-model="notes"
        rows="3"
        maxlength="10000"
        class="finbar-field-input"
      />
    </div>

    <p
      v-if="error"
      class="text-sm text-red-400"
    >
      {{ error }}
    </p>

    <button
      type="submit"
      :disabled="loading"
      class="finbar-btn-primary w-full min-w-0 sm:w-auto"
    >
      {{ loading ? "Opslaan…" : "Relatie aanmaken" }}
    </button>
  </form>
</template>
