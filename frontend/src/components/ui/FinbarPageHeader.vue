<script setup lang="ts">
defineOptions({ name: "FinbarPageHeader" });

defineProps<{
  title: string;
}>();
</script>

<template>
  <header class="mb-[var(--finbar-space-section)] flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0">
      <h1
        class="text-[length:var(--finbar-text-page-title)] font-semibold leading-tight text-zinc-900 dark:text-white"
      >
        {{ title }}
      </h1>
      <p
        v-if="$slots.description"
        class="mt-1 text-sm text-zinc-600 dark:text-zinc-300"
      >
        <slot name="description" />
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="flex shrink-0 flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </header>
</template>
