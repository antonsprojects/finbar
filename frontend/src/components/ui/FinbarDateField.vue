<script setup lang="ts">
import FinbarCalendarMonthPanel from "@/components/ui/FinbarCalendarMonthPanel.vue";
import { formatLocalYmd } from "@/lib/localDate";
import {
  computed,
  nextTick,
  onUnmounted,
  ref,
  useAttrs,
  watch,
} from "vue";

defineOptions({ name: "FinbarDateField", inheritAttrs: false });

const attrs = useAttrs();

const props = withDefaults(
  defineProps<{
    id?: string;
    /** `YYYY-MM-DD` */
    min?: string;
    /** `YYYY-MM-DD` */
    max?: string;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    id: undefined,
    min: undefined,
    max: undefined,
    disabled: false,
    placeholder: "Kies datum",
  },
);

const model = defineModel<string>({ default: "" });

const open = ref(false);
const anchorEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

const calMonth = ref(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
);

const todayYmd = ref(formatLocalYmd(new Date()));

const displayLabel = computed(() => {
  const v = model.value?.trim();
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("nl-NL");
});

const PANEL_EST_H = 360;
const H_PAD = 8;
const V_GAP = 6;

function positionPanel() {
  const btn = anchorEl.value?.querySelector("button");
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const panelW = Math.min(304, vw - 2 * H_PAD);
  let left = r.left + r.width / 2 - panelW / 2;
  left = Math.max(H_PAD, Math.min(left, vw - panelW - H_PAD));
  let top = r.bottom + V_GAP;
  if (top + PANEL_EST_H > vh - H_PAD) {
    top = Math.max(H_PAD, r.top - V_GAP - PANEL_EST_H);
  }
  panelStyle.value = {
    position: "fixed",
    top: `${top}px`,
    left: `${left}px`,
    width: `${panelW}px`,
    maxWidth: `calc(100vw - ${2 * H_PAD}px)`,
  };
}

function close() {
  open.value = false;
}

function onScrollOrResize() {
  if (open.value) positionPanel();
}

function onDocPointerDown(ev: PointerEvent | MouseEvent) {
  if (!open.value) return;
  const r = anchorEl.value;
  const p = panelEl.value;
  const t = ev.target;
  if (t instanceof Node) {
    if (r?.contains(t)) return;
    if (p?.contains(t)) return;
  }
  close();
}

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
}

watch(open, async (isOpen) => {
  if (isOpen) {
    todayYmd.value = formatLocalYmd(new Date());
    const v = model.value?.trim();
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [yy, mm] = v.split("-").map(Number);
      calMonth.value = new Date(yy, mm - 1, 1);
    } else {
      const n = new Date();
      calMonth.value = new Date(n.getFullYear(), n.getMonth(), 1);
    }
    await nextTick();
    positionPanel();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    document.addEventListener("pointerdown", onDocPointerDown, true);
  } else {
    window.removeEventListener("resize", onScrollOrResize);
    window.removeEventListener("scroll", onScrollOrResize, true);
    document.removeEventListener("pointerdown", onDocPointerDown, true);
  }
});

function onPick(ymd: string) {
  model.value = ymd;
  close();
}

onUnmounted(() => {
  window.removeEventListener("resize", onScrollOrResize);
  window.removeEventListener("scroll", onScrollOrResize, true);
  document.removeEventListener("pointerdown", onDocPointerDown, true);
});
</script>

<template>
  <div
    ref="anchorEl"
    class="relative w-full min-w-0"
  >
    <button
      :id="id"
      type="button"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="dialog"
      class="finbar-field-input flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 text-left tabular-nums disabled:cursor-not-allowed disabled:opacity-50"
      :class="attrs.class"
      @click.stop="toggle"
    >
      <span
        :class="[
          displayLabel ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500',
        ]"
      >
        {{ displayLabel || placeholder }}
      </span>
      <svg
        class="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 1.75v2M11 1.75v2M2.5 5h11M14 14.25H2V5h12v9.25Z"
          stroke="currentColor"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        :style="panelStyle"
        class="z-[260] rounded-xl border border-zinc-300 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-label="Kalender"
        @click.stop
      >
        <FinbarCalendarMonthPanel
          v-model:month-anchor="calMonth"
          :selected-ymd="model || null"
          :today-ymd="todayYmd"
          :min-ymd="min ?? null"
          :max-ymd="max ?? null"
          @pick="onPick"
        />
      </div>
    </Teleport>
  </div>
</template>
