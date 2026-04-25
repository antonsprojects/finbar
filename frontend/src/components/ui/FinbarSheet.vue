<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";

defineOptions({ name: "FinbarSheet" });

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    side?: "bottom" | "end";
    title?: string;
  }>(),
  { side: "bottom", title: "" },
);

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

const containerClass = computed(() =>
  props.side === "bottom"
    ? "max-sm:items-stretch max-sm:justify-stretch sm:items-end sm:justify-center"
    : "max-sm:items-stretch max-sm:justify-stretch sm:justify-end",
);

const panelClass = computed(() =>
  props.side === "end"
    ? "right-0 top-0 h-full w-full max-w-md max-sm:max-w-full border-l"
    : "bottom-0 left-0 right-0 w-full max-sm:h-full max-sm:min-h-0 max-sm:max-h-[100dvh] max-sm:rounded-none max-h-[85vh] rounded-t-[var(--finbar-radius-xl)] border-t",
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex"
      :class="containerClass"
      role="presentation"
    >
      <div
        class="absolute inset-0 bg-black/60"
        aria-hidden="true"
        @click="close"
      />
      <div
        class="relative z-10 flex min-h-0 max-h-full flex-col border border-zinc-200 bg-white shadow-xl max-sm:max-h-[100dvh] dark:border-zinc-800 dark:bg-zinc-900"
        :class="panelClass"
        role="dialog"
        aria-modal="true"
        :aria-label="title || 'Paneel'"
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
            <h2 class="text-lg font-semibold text-zinc-900 dark:text-white">
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
      </div>
    </div>
  </Teleport>
</template>
