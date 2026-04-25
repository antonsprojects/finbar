<script setup lang="ts">
import { computed } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { RouterLink } from "vue-router";

defineOptions({ name: "TodayAddToolbarButton" });

const props = withDefaults(
  defineProps<{
    label: string;
    /**
     * Korte `label` in de UI, langere omschrijving voor hulpsoftware
     * (bijv. label="Teamleden" + accessibilityLabel="Teamleden inplannen").
     */
    accessibilityLabel?: string;
    /** Alleen `max-md`: kortere zichtbare tekst (b.v. "Fase" i.p.v. "Fase toevoegen"). */
    labelNarrow?: string;
    /** Alleen + icoon; `label` is dan `aria-label` tenzij `accessibilityLabel` gezet is. */
    iconOnly?: boolean;
    /** Volledig ronde knop; zelfde taal als dag-nav (`rounded-full` + border). */
    pill?: boolean;
    /** Vult de breedte van de parent (bijv. 50% in een twee-koloms grid). */
    fullWidth?: boolean;
    /**
     * Smalle viewports: groter plus-icoon links, label gecentreerd in de resterende ruimte
     * (Planning: brede 50% knoppen met fullWidth, of compacte knop op bv. begroting).
     * Niet combineren met iconOnly.
     */
    mobileAddToolbarLayout?: boolean;
    /** Niet-klikbaar; bijv. als een andere actie al actief is. */
    disabled?: boolean;
    /** Als gezet: navigatie-link i.p.v. knop. */
    to?: RouteLocationRaw;
  }>(),
  {
    iconOnly: false,
    pill: false,
    fullWidth: false,
    mobileAddToolbarLayout: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  click: [];
}>();

const iconSvgClass = computed(() =>
  props.iconOnly
    ? "h-[1.125rem] w-[1.125rem] shrink-0"
    : "h-4 w-4 shrink-0",
);

/** Plus-icoon naast label (niet iconOnly). */
const plusInCircleClass = computed(() => {
  if (props.iconOnly) return iconSvgClass.value;
  if (props.mobileAddToolbarLayout) {
    return "h-4 w-4 max-md:h-5 max-md:w-5 shrink-0 self-center";
  }
  return "h-4 w-4 shrink-0";
});

const labelSpanClass = computed(() => {
  if (props.iconOnly) return "";
  if (props.mobileAddToolbarLayout) {
    if (props.labelNarrow) {
      return "min-w-0 shrink-0 max-md:text-left";
    }
    return "min-w-0 max-md:flex-1 max-md:text-center truncate";
  }
  return "min-w-0 truncate";
});

const classes = computed(() => {
  if (props.iconOnly && props.pill && props.fullWidth) {
    return [
      "flex w-full min-w-0 finbar-pill-height items-center justify-center gap-0 p-0 text-center text-sm font-medium transition-colors rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800",
      props.disabled &&
        "cursor-not-allowed opacity-45 hover:bg-white dark:hover:bg-zinc-900/90",
    ];
  }
  if (props.mobileAddToolbarLayout && props.pill && !props.iconOnly) {
    const dis =
      props.disabled &&
      "cursor-not-allowed opacity-45 hover:bg-white dark:hover:bg-zinc-900/90";
    if (props.fullWidth) {
      return [
        "flex w-full min-w-0 finbar-pill-height items-center text-sm font-medium transition-colors",
        "max-md:items-center max-md:justify-start",
        props.labelNarrow
          ? "max-md:gap-2 max-md:pl-4 max-md:pr-5"
          : "max-md:gap-1.5 max-md:pl-2.5 max-md:pr-3",
        "md:justify-center md:gap-2 md:px-3",
        "min-w-0 whitespace-normal rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800",
        dis,
      ];
    }
    return [
      "inline-flex min-w-0 max-w-full finbar-pill-height items-center text-sm font-medium transition-colors",
      props.labelNarrow
        ? "max-md:justify-start max-md:gap-2 max-md:pl-4 max-md:pr-5"
        : "max-md:justify-start max-md:gap-0 max-md:pl-2.5 max-md:pr-3",
      "md:gap-2 md:px-3",
      "shrink-0 whitespace-nowrap rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800",
      dis,
    ];
  }
  const baseLayout = props.pill
    ? props.fullWidth
      ? "flex w-full min-w-0 finbar-pill-height items-center justify-center gap-2 px-3 text-center text-sm font-medium transition-colors"
      : "inline-flex finbar-pill-height items-center gap-2 px-3 text-left text-sm font-medium transition-colors"
    : props.fullWidth
      ? "flex w-full min-w-0 items-center justify-center gap-2 px-3 py-1.5 text-center text-sm font-medium transition-colors"
      : "inline-flex items-center gap-2 px-3 py-1.5 text-left text-sm font-medium transition-colors";
  const layout = baseLayout;
  const pill = props.pill
    ? props.fullWidth
      ? "min-w-0 whitespace-normal rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
      : "shrink-0 whitespace-nowrap rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
    : "rounded-[calc(var(--finbar-radius-sm))] bg-white text-xs text-zinc-900 shadow-sm hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";
  const dis =
    props.disabled &&
    "cursor-not-allowed opacity-45 hover:bg-white dark:hover:bg-zinc-900/90";
  return [layout, pill, dis];
});

function onClick() {
  if (props.disabled) {
    return;
  }
  emit("click");
}

const effectiveAriaLabel = computed(() => {
  if (props.iconOnly) {
    return props.accessibilityLabel ?? props.label;
  }
  if (props.labelNarrow) {
    return props.accessibilityLabel ?? props.label;
  }
  if (props.accessibilityLabel) {
    return props.accessibilityLabel;
  }
  return undefined;
});
</script>

<template>
  <RouterLink
    v-if="to"
    :to="to"
    :class="classes"
    :aria-label="effectiveAriaLabel"
    @click="onClick"
  >
    <svg
      v-if="iconOnly"
      :class="iconSvgClass"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M8 2.5v11M2.5 8h11"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else
      :class="plusInCircleClass"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span
      v-if="!iconOnly"
      :class="labelSpanClass"
    >
      <template v-if="labelNarrow">
        <span class="md:hidden">{{ labelNarrow }}</span>
        <span class="hidden md:inline">{{ label }}</span>
      </template>
      <template v-else>{{ label }}</template>
    </span>
  </RouterLink>
  <button
    v-else
    type="button"
    :class="classes"
    :disabled="disabled"
    :aria-label="effectiveAriaLabel"
    @click="onClick"
  >
    <svg
      v-if="iconOnly"
      :class="iconSvgClass"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M8 2.5v11M2.5 8h11"
        stroke-width="1.75"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else
      :class="plusInCircleClass"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
    <span
      v-if="!iconOnly"
      :class="labelSpanClass"
    >
      <template v-if="labelNarrow">
        <span class="md:hidden">{{ labelNarrow }}</span>
        <span class="hidden md:inline">{{ label }}</span>
      </template>
      <template v-else>{{ label }}</template>
    </span>
  </button>
</template>
