<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";

defineOptions({ name: "FinbarDialog" });

const props = defineProps<{
  modelValue: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [open: boolean];
}>();

function close() {
  emit("update:modelValue", false);
}

function onKey(e: { key: string }) {
  if (e.key === "Escape") {
    close();
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === "undefined") return;
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    }
  },
);

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("keydown", onKey);
    document.body.style.overflow = "";
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex max-sm:items-stretch max-sm:justify-stretch max-sm:p-0 sm:items-center sm:justify-center sm:p-4"
      role="presentation"
    >
      <div
        class="absolute inset-0 bg-black/60"
        aria-hidden="true"
        @click="close"
      />
      <div
        class="relative z-10 flex min-h-0 w-full min-w-0 max-w-lg flex-col overflow-hidden bg-white max-sm:h-full max-sm:max-h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 sm:max-h-[min(90vh,40rem)] sm:rounded-[var(--finbar-radius-lg)] sm:border sm:border-zinc-200 sm:shadow-xl dark:bg-zinc-900 dark:sm:border-zinc-800"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'finbar-dialog-title' : undefined"
        @click.stop
      >
        <button
          type="button"
          class="absolute right-2 top-2 z-20 rounded-md p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 sm:right-3 sm:top-3 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          aria-label="Sluiten"
          @click="close"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div
          v-if="title || $slots.title"
          class="flex shrink-0 items-center border-b border-zinc-200 px-4 py-3 pr-14 dark:border-zinc-800"
        >
          <slot name="title">
            <h2
              id="finbar-dialog-title"
              class="text-lg font-semibold text-zinc-900 dark:text-white"
            >
              {{ title }}
            </h2>
          </slot>
        </div>
        <div
          class="min-h-0 flex-1 overflow-y-auto p-4"
          :class="title || $slots.title ? '' : 'pt-12'"
        >
          <slot />
        </div>
        <div
          v-if="$slots.footer"
          class="shrink-0 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
