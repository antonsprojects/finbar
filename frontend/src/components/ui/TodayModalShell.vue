<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";

defineOptions({ name: "TodayModalShell" });

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    /** Smaller panel + padding (e.g. date picker). */
    compact?: boolean;
    /** Iets hogere `z-index` wanneer deze dialoog boven een andere TodayModalShell moet (bijv. contact aanmaken na team). */
    stacked?: boolean;
    /**
     * Groot bewerkingspaneel: 90% viewport, max 1000×600 (sm+).
     * Onder `max-sm`: zelfde fullscreen als andere dialoogvensters.
     */
    wide?: boolean;
    /**
     * Alleen met `wide`. Geen kader-padding op de body; de inhoud (b.v. vaste
     * `zinc-50`-header + scroll) regelt alles. Voorkomt dubbele scrollbalken.
     */
    internalScroll?: boolean;
  }>(),
  { compact: false, stacked: false, wide: false, internalScroll: false },
);

const emit = defineEmits<{
  "update:modelValue": [open: boolean];
}>();

const overlayZ = computed(() => (props.stacked ? "z-[210]" : "z-[200]"));

const overlayClass = computed(() => {
  if (props.wide) {
    return `fixed inset-0 ${overlayZ.value} flex bg-black/70 max-sm:items-stretch max-sm:justify-stretch max-sm:p-0 sm:items-center sm:justify-center sm:p-0`;
  }
  return props.compact
    ? `fixed inset-0 ${overlayZ.value} flex bg-black/70 max-sm:items-stretch max-sm:justify-stretch max-sm:p-0 sm:items-center sm:justify-center sm:p-3 sm:p-4`
    : `fixed inset-0 ${overlayZ.value} flex bg-black/70 max-sm:items-stretch max-sm:justify-stretch max-sm:p-0 sm:items-center sm:justify-center sm:p-4 sm:p-8`;
});

const panelClass = computed(() => {
  if (props.wide) {
    if (props.internalScroll) {
      return "relative z-10 flex min-h-0 w-full min-w-0 flex-col bg-zinc-50 dark:bg-zinc-950 max-sm:h-full max-sm:min-h-0 max-sm:max-h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 sm:h-[min(90vh,600px)] sm:max-h-[600px] sm:w-[min(90vw,1000px)] sm:max-w-[1000px] sm:min-h-0 sm:rounded-[var(--finbar-radius-lg)] sm:border sm:border-zinc-200 sm:shadow-2xl dark:sm:border-zinc-700";
    }
    return "relative z-10 flex min-h-0 w-full min-w-0 flex-col bg-white dark:bg-zinc-900 max-sm:h-full max-sm:min-h-0 max-sm:max-h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 sm:h-[min(90vh,600px)] sm:max-h-[600px] sm:w-[min(90vw,1000px)] sm:max-w-[1000px] sm:min-h-0 sm:rounded-[var(--finbar-radius-lg)] sm:border sm:border-zinc-200 sm:shadow-2xl dark:sm:border-zinc-700";
  }
  return props.compact
    ? "relative z-10 flex min-h-0 w-full min-w-0 flex-col bg-white dark:bg-zinc-900 max-sm:h-full max-sm:max-h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 sm:max-h-[min(92vh,34rem)] sm:max-w-sm sm:rounded-[var(--finbar-radius-lg)] sm:border sm:border-zinc-200 sm:shadow-2xl dark:sm:border-zinc-700"
    : "relative z-10 flex min-h-0 w-full min-w-0 max-w-2xl flex-col bg-white dark:bg-zinc-900 max-sm:h-full max-sm:max-h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 sm:max-h-[min(90vh,44rem)] sm:rounded-[var(--finbar-radius-lg)] sm:border sm:border-zinc-200 sm:shadow-2xl dark:sm:border-zinc-700";
});

/** Mobiel: geen hoge `pt-12` (titel stond onder het kruis); `pr-12` i.p.v. verticale uitweg. */
const bodyPadding = computed(() => {
  if (props.wide && props.internalScroll) {
    return "p-0";
  }
  return props.compact
    ? "px-4 pb-3 max-sm:pt-2.5 max-sm:pr-12 sm:px-4 sm:pt-4 sm:pb-4"
    : "px-4 pb-3 max-sm:pt-2.5 max-sm:pr-12 sm:px-6 sm:pt-6 sm:pb-3";
});

const bodyScrollClass = computed(() => {
  if (props.wide) {
    if (props.internalScroll) {
      return "min-h-0 min-w-0 w-full flex-1 flex flex-col overflow-hidden sm:min-h-0";
    }
    return "min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden";
  }
  if (props.compact) {
    return "min-h-0 min-w-0 w-full max-h-[min(92vh,34rem)] overflow-y-auto overflow-x-hidden";
  }
  return "min-h-0 min-w-0 w-full max-h-[min(90vh,44rem)] overflow-y-auto overflow-x-hidden";
});

/** Sluitknop: bij `wide`+`internalScroll` verticaal midden t.o.v. titelregel in WorkerDetailBody. */
const closeButtonClass = computed(() => {
  const base =
    "absolute z-20 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md p-0 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white";
  if (props.wide && props.internalScroll) {
    return [
      base,
      "right-2 sm:right-3",
      "max-sm:top-[calc(max(0.25rem,env(safe-area-inset-top,0px))+0.25rem-2px)]",
      "sm:top-[calc(max(0.25rem,env(safe-area-inset-top,0px))+0.375rem)]",
    ].join(" ");
  }
  return [base, "right-2 top-2.5 sm:right-3 sm:top-3"].join(" ");
});

function close() {
  emit("update:modelValue", false);
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") close();
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
      :class="overlayClass"
      role="presentation"
      @click="close"
    >
      <div
        :class="panelClass"
        role="dialog"
        aria-modal="true"
        @click.stop
      >
        <button
          type="button"
          :class="closeButtonClass"
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
          :class="[bodyScrollClass, bodyPadding]"
        >
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
