<script setup lang="ts">
import { computed } from "vue";

defineOptions({ name: "FinbarButton" });

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "accent" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md";
    block?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    variant: "primary",
    size: "md",
    block: false,
    type: "button",
  },
);

const variantClass = computed(() => {
  switch (props.variant) {
    case "accent":
      return "border border-zinc-400 bg-transparent text-zinc-800 hover:bg-zinc-100 focus-visible:ring-zinc-400/40 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-500/40";
    case "secondary":
      return "border border-zinc-300 bg-transparent text-zinc-800 hover:bg-zinc-100 focus-visible:ring-zinc-400/40 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:focus-visible:ring-zinc-500/40";
    case "ghost":
      return "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-zinc-400/40 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 dark:focus-visible:ring-zinc-500/40";
    case "danger":
      return "border border-red-300 bg-transparent text-red-700 hover:bg-red-50 focus-visible:ring-red-400/40 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/50 dark:focus-visible:ring-red-500/40";
    default:
      return "border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:ring-zinc-400/50 dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:focus-visible:ring-zinc-400/50";
  }
});

const sizeClass = computed(() =>
  props.size === "sm"
    ? "px-2.5 py-1.5 text-sm"
    : "px-4 py-2 text-sm font-medium",
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 rounded-[var(--finbar-radius)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-zinc-950"
    :class="[variantClass, sizeClass, block ? 'w-full' : '']"
  >
    <slot />
  </button>
</template>
