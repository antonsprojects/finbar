<script setup lang="ts">
defineOptions({ name: "FinbarToggle" });

defineProps<{
  modelValue: boolean;
  disabled?: boolean;
  label: string;
  description?: string;
  inputId: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

function onChange(e: Event) {
  const t = e.target as HTMLInputElement;
  emit("update:modelValue", t.checked);
}
</script>

<template>
  <label
    class="flex cursor-pointer items-start gap-3 rounded-[var(--finbar-radius)] border border-zinc-200 bg-zinc-50 px-3 py-3 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 dark:border-zinc-700/80 dark:bg-zinc-950/50"
  >
    <input
      :id="inputId"
      type="checkbox"
      class="mt-1 size-4 shrink-0 rounded border-zinc-400 accent-zinc-700 focus:ring-zinc-500 dark:border-zinc-600 dark:accent-zinc-400"
      :checked="modelValue"
      :disabled="disabled"
      @change="onChange"
    >
    <span class="min-w-0">
      <span class="block font-medium text-zinc-900 dark:text-zinc-100">{{ label }}</span>
      <span
        v-if="description"
        class="mt-0.5 block text-sm text-zinc-600 dark:text-zinc-500"
      >{{ description }}</span>
    </span>
  </label>
</template>
