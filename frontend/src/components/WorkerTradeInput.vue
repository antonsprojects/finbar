<script setup lang="ts">
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/vue";
import { computed, ref } from "vue";

defineOptions({ name: "WorkerTradeInput" });

const props = withDefaults(
  defineProps<{
    inputId: string;
    /** Eerdere vakgebied-waarden (bijv. uit teamleden), worden ontdubbeld en alfabetisch gesorteerd. */
    suggestions: string[];
    label?: string;
  }>(),
  { label: "Vakgebied" },
);

const model = defineModel<string>({ required: true });

/** Alleen voor filteren tijdens typen; leeg = toon alle netwerk-suggesties (niet het huidige vakgebied als zoekterm). */
const searchQuery = ref("");

const sortedOptions = computed(() => {
  const seen = new Set<string>();
  for (const t of props.suggestions) {
    const s = typeof t === "string" ? t.trim() : "";
    if (s) seen.add(s);
  }
  return [...seen].sort((a, b) =>
    a.localeCompare(b, "nl", { sensitivity: "base" }),
  );
});

/** Filter op `searchQuery`, niet op het opgeslagen vakgebied — anders lijkt de lijst leeg bij bestaande teamleden. */
const filteredOptions = computed(() => {
  const base = sortedOptions.value;
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return base;
  return base.filter((o) => o.toLowerCase().includes(q));
});

function onInputChange(e: Event) {
  const el = e.target as HTMLInputElement;
  const v = el.value;
  searchQuery.value = v;
  model.value = v;
}

function displayValue(v: unknown): string {
  return typeof v === "string" ? v : "";
}
</script>

<template>
  <div>
    <label
      class="finbar-field-label"
      :for="inputId"
    >{{ label }}</label>

    <Combobox
      v-model="model"
      as="div"
      class="relative"
      nullable
    >
      <div class="relative">
        <ComboboxInput
          :id="inputId"
          :display-value="displayValue"
          maxlength="500"
          autocomplete="off"
          class="finbar-field-input w-full pr-10"
          @change="onInputChange"
        />
        <ComboboxButton
          type="button"
          class="absolute inset-y-0 right-0 flex items-center rounded-r-[calc(var(--finbar-radius-sm))] px-2 text-zinc-500 hover:text-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 dark:text-zinc-400 dark:hover:text-zinc-200"
          :aria-label="'Suggesties openen voor ' + label"
        >
          <svg
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </ComboboxButton>
      </div>

      <ComboboxOptions
        class="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-[calc(var(--finbar-radius-sm))] border border-zinc-200 bg-white py-1 shadow-lg ring-1 ring-black/5 outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10"
      >
        <ComboboxOption
          v-for="opt in filteredOptions"
          :key="opt"
          v-slot="{ active, selected }"
          :value="opt"
        >
          <span
            :class="[
              'block cursor-pointer px-3 py-2 text-sm',
              active
                ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-900 dark:text-zinc-100',
              selected && 'font-medium',
            ]"
          >{{ opt }}</span>
        </ComboboxOption>
        <li
          v-if="filteredOptions.length === 0 && sortedOptions.length > 0"
          class="list-none px-3 py-2 text-sm text-zinc-500 pointer-events-none dark:text-zinc-400"
        >
          Geen overeenkomsten — Voeg nieuwe omschrijving toe
        </li>
        <li
          v-if="sortedOptions.length === 0"
          class="list-none px-3 py-2 text-sm text-zinc-500 pointer-events-none dark:text-zinc-400"
        >
          Nog geen eerdere vakgebieden — typ om toe te voegen.
        </li>
      </ComboboxOptions>
    </Combobox>
  </div>
</template>
