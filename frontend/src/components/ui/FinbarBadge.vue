<script setup lang="ts">
import { computed } from "vue";

defineOptions({ name: "FinbarBadge" });

const props = withDefaults(
  defineProps<{
    variant?: "neutral" | "success" | "warning" | "danger";
  }>(),
  { variant: "neutral" },
);

const variantClass = computed(() => {
  switch (props.variant) {
    case "success":
      return "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300";
    case "warning":
      return "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/50 dark:text-amber-200";
    case "danger":
      return "border-red-800/80 bg-red-950/50 text-red-200";
    default:
      return "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300";
  }
});
</script>

<template>
  <span
    class="inline-flex items-center rounded-[var(--finbar-radius-sm)] border px-2 py-0.5 text-xs font-medium"
    :class="variantClass"
  >
    <slot />
  </span>
</template>
