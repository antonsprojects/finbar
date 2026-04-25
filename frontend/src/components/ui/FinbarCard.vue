<script setup lang="ts">
import { computed } from "vue";

defineOptions({ name: "FinbarCard" });

const props = withDefaults(
  defineProps<{
    padding?: "none" | "sm" | "md";
    as?: "div" | "section" | "article";
  }>(),
  {
    padding: "md",
    as: "div",
  },
);

const paddingClass = computed(() => {
  switch (props.padding) {
    case "none":
      return "";
    case "sm":
      return "p-3";
    default:
      return "p-4";
  }
});
</script>

<template>
  <component
    :is="as"
    class="rounded-[var(--finbar-radius-lg)] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:shadow-none"
    :class="paddingClass"
  >
    <slot />
  </component>
</template>
