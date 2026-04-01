<script setup lang="ts">
defineOptions({ name: "JobDetailView" });

defineProps<{
  id: string;
}>();
</script>

<template>
  <div class="space-y-2">
    <h1 class="text-xl font-semibold text-white">Job</h1>
    <p class="font-mono text-sm text-zinc-400">id: {{ id }}</p>
    <p class="text-sm text-zinc-400">Placeholder — job detail.</p>
  </div>
</template>
