<script setup lang="ts">
import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/vue";
import {
  WORKER_TRADE_MAX_LEN,
  WORKER_TRADES_MAX_COUNT,
} from "@/lib/workerTrades";
import { computed, ref, watch } from "vue";

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

const model = defineModel<string[]>({ required: true });

/** Keuze uit dropdown zet meteen een tag; combobox-waarde blijft leeg. */
const comboboxKey = ref(0);

/** Typfilter voor suggesties (los van gekozen tags). */
const searchQuery = ref("");

/** Opties uit het netwerk minus al gekozen tags (case-insensitive). */
const sortedNetworkOptions = computed(() => {
  const chosen = new Set(
    model.value.map((t) => t.trim().toLocaleLowerCase("nl-NL")),
  );
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of props.suggestions) {
    const s = typeof t === "string" ? t.trim() : "";
    if (!s) continue;
    const k = s.toLocaleLowerCase("nl-NL");
    if (chosen.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out.sort((a, b) =>
    a.localeCompare(b, "nl", { sensitivity: "base" }),
  );
});

const filteredOptions = computed(() => {
  const base = sortedNetworkOptions.value;
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return base;
  return base.filter((o) => o.toLowerCase().includes(q));
});

function addTag(raw: string) {
  const t = raw.trim().slice(0, WORKER_TRADE_MAX_LEN);
  if (!t) return;
  if (model.value.length >= WORKER_TRADES_MAX_COUNT) return;
  const k = t.toLocaleLowerCase("nl-NL");
  if (
    model.value.some((x) => x.trim().toLocaleLowerCase("nl-NL") === k)
  ) {
    searchQuery.value = "";
    return;
  }
  model.value = [...model.value, t];
  searchQuery.value = "";
  comboboxKey.value += 1;
}

function removeTag(tag: string) {
  model.value = model.value.filter((x) => x !== tag);
}

function onInputChange(e: Event) {
  const el = e.target as HTMLInputElement;
  searchQuery.value = el.value;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    addTag(searchQuery.value);
    return;
  }
  if (
    e.key === "Backspace" &&
    searchQuery.value === "" &&
    model.value.length > 0
  ) {
    removeTag(model.value[model.value.length - 1]);
  }
}

/** Forceer lege combobox-display na selectie. */
watch(comboboxKey, () => {
  searchQuery.value = "";
});

function displayValue(): string {
  return "";
}

function onComboboxSelect(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    addTag(value);
  }
}
</script>

<template>
  <div>
    <label
      class="finbar-field-label"
      :for="inputId"
    >{{ label }}</label>

    <Combobox
      :key="comboboxKey"
      :model-value="null"
      as="div"
      class="relative"
      nullable
      @update:model-value="onComboboxSelect"
    >
      <div
        class="finbar-field-input flex min-h-[2.75rem] w-full flex-wrap items-center gap-1 py-1.5 pl-2 pr-10"
      >
        <button
          v-for="tag in model"
          :key="tag"
          type="button"
          class="inline-flex max-w-full shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-left text-xs font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          :title="`Verwijder ${tag}`"
          @click.stop.prevent="removeTag(tag)"
        >
          <span class="min-w-0 truncate">{{ tag }}</span>
          <span
            class="text-zinc-500 dark:text-zinc-400"
            aria-hidden="true"
          >×</span>
        </button>

        <ComboboxInput
          :id="inputId"
          :display-value="displayValue"
          :maxlength="WORKER_TRADE_MAX_LEN"
          autocomplete="off"
          class="min-h-[1.75rem] min-w-[6rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          placeholder="Typ en Enter of kies suggestie…"
          @input="onInputChange"
          @keydown="onKeydown"
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
          v-if="filteredOptions.length === 0 && sortedNetworkOptions.length > 0"
          class="pointer-events-none list-none px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400"
        >
          Geen overeenkomsten — druk Enter om toe te voegen
        </li>
        <li
          v-if="sortedNetworkOptions.length === 0"
          class="pointer-events-none list-none px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400"
        >
          Nog geen eerdere vakgebieden — typ en druk Enter om toe te voegen.
        </li>
      </ComboboxOptions>
    </Combobox>

    <p
      v-if="model.length >= WORKER_TRADES_MAX_COUNT"
      class="mt-1 text-xs text-amber-700 dark:text-amber-400/90"
    >
      Maximum {{ WORKER_TRADES_MAX_COUNT }} vakgebieden bereikt.
    </p>
  </div>
</template>
