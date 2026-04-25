<script setup lang="ts">
import { useThemeStore, type ColorSchemePreference } from "@/stores/theme";
import { storeToRefs } from "pinia";

defineOptions({ name: "FinbarThemeToggle" });

const theme = useThemeStore();
const { preference } = storeToRefs(theme);

const options: { value: ColorSchemePreference; label: string }[] = [
  { value: "light", label: "Licht" },
  { value: "dark", label: "Donker" },
  { value: "system", label: "Systeem" },
];

function isActive(v: ColorSchemePreference) {
  return preference.value === v;
}
</script>

<template>
  <div
    class="inline-flex rounded-[var(--finbar-radius)] border border-zinc-300 bg-zinc-100/80 p-0.5 dark:border-zinc-600 dark:bg-zinc-900/60"
    role="group"
    aria-label="Kleurthema"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="rounded-[calc(var(--finbar-radius-sm))] px-2 py-1 text-xs font-medium transition-colors"
      :class="
        isActive(opt.value)
          ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
      "
      :aria-pressed="isActive(opt.value)"
      @click="theme.setPreference(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
