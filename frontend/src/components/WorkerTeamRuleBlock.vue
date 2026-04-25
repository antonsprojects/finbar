<script setup lang="ts">
import { computed } from "vue";

defineOptions({ name: "WorkerTeamRuleBlock" });

const props = defineProps<{
  availability: string | null;
  absence: string[];
}>();

const absenceJoined = computed(() => props.absence.join(" · "));
</script>

<template>
  <div
    v-if="availability || absence.length"
    class="flex min-h-0 min-w-0 max-w-full flex-col gap-0.5 text-xs leading-4 text-zinc-600 dark:text-zinc-400"
  >
    <p
      v-if="availability"
      class="min-w-0 truncate"
      :title="`Beschikbaar: ${availability}`"
    >
      <span class="font-semibold text-zinc-700 dark:text-zinc-200">Beschikbaar: </span>
      <span class="font-normal text-zinc-600 dark:text-zinc-300">{{ availability }}</span>
    </p>
    <p
      v-if="absence.length"
      class="min-w-0 truncate"
      :title="`Afwezig: ${absenceJoined}`"
    >
      <span class="font-semibold text-zinc-700 dark:text-zinc-200">Afwezig: </span>
      <span class="font-normal text-zinc-600 dark:text-zinc-300">{{ absenceJoined }}</span>
    </p>
  </div>
</template>
