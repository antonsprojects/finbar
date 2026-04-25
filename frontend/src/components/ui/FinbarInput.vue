<script setup lang="ts">
import { computed, useAttrs } from "vue";

defineOptions({ name: "FinbarInput", inheritAttrs: false });

defineProps<{
  modelValue: string;
  id: string;
  label?: string;
  hint?: string;
  error?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const attrs = useAttrs();

const inputClass = computed(
  () =>
    "w-full rounded-[var(--finbar-radius)] border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500",
);

function onInput(e: Event) {
  const t = e.target as HTMLInputElement;
  emit("update:modelValue", t.value);
}
</script>

<template>
  <div class="space-y-1">
    <label
      v-if="label"
      :for="id"
      class="mb-1 block text-[length:var(--finbar-text-label)] text-zinc-600 dark:text-zinc-400"
    >
      {{ label }}
    </label>
    <input
      :id="id"
      :value="modelValue"
      :class="[inputClass, error ? 'border-red-800' : '']"
      v-bind="attrs"
      @input="onInput"
    >
    <p
      v-if="hint && !error"
      class="text-xs text-zinc-600 dark:text-zinc-500"
    >
      {{ hint }}
    </p>
    <p
      v-if="error"
      class="text-sm text-red-400"
    >
      {{ error }}
    </p>
  </div>
</template>
