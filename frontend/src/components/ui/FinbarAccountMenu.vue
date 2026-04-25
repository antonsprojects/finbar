<script setup lang="ts">
import FinbarButton from "./FinbarButton.vue";
import { useAuthStore } from "@/stores/auth";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { RouterLink, useRoute, useRouter } from "vue-router";

defineOptions({ name: "FinbarAccountMenu" });

defineProps<{
  /** Waar 'Instellingen' naartoe linkt; ontbreekt deze prop, dan wordt de link niet getoond. */
  settingsTo?: RouteLocationRaw;
}>();

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

const accountLabel = computed(() => {
  const u = auth.user;
  if (!u) return "";
  const n = u.name?.trim();
  return n && n.length > 0 ? n : u.email;
});

/** Eén zichtbaar teken voor compacte mobile-avatar (o.a. emoji → eerste teken) */
const accountInitial = computed(() => {
  const label = accountLabel.value;
  if (!label) return "?";
  const ch = label.trim().charAt(0);
  return ch ? ch.toLocaleUpperCase("nl") : "?";
});

function toggle() {
  open.value = !open.value;
}

function close() {
  open.value = false;
}

function onDocumentPointerDown(e: PointerEvent) {
  const el = rootEl.value;
  if (!open.value || !el) return;
  const t = e.target;
  if (t instanceof Node && el.contains(t)) return;
  open.value = false;
}

watch(
  () => route.fullPath,
  () => {
    close();
  },
);

onMounted(() => {
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
});

async function onLogout() {
  close();
  await auth.logout();
  await router.push("/login");
}
</script>

<template>
  <div
    ref="rootEl"
    class="relative z-20 shrink-0"
  >
    <button
      type="button"
      class="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-transparent p-0.5 text-left text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300/80 hover:bg-zinc-100/90 sm:max-w-[min(100vw-8rem,14rem)] sm:rounded-[var(--finbar-radius)] sm:px-2 sm:py-1.5 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60"
      :aria-expanded="open"
      aria-haspopup="true"
      :aria-label="`Account, ${accountLabel}`"
      :title="auth.user?.email ?? accountLabel"
      @click="toggle"
    >
      <span
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-300/80 bg-zinc-200/90 text-sm font-semibold leading-none text-zinc-800 tabular-nums shadow-sm sm:hidden dark:border-zinc-600/80 dark:bg-zinc-700/90 dark:text-zinc-100"
        aria-hidden="true"
      >{{ accountInitial }}</span>
      <span
        class="hidden min-w-0 flex-1 truncate sm:inline"
      >{{ accountLabel }}</span>
      <svg
        class="hidden h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-200 sm:block dark:text-zinc-400"
        :class="{ 'rotate-180': open }"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <div
      v-show="open"
      class="absolute right-0 mt-1 w-[min(calc(100vw-2rem),17rem)] rounded-[var(--finbar-radius-lg)] border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      role="menu"
      aria-label="Accountmenu"
    >
      <p
        v-if="auth.user?.name?.trim()"
        class="mb-0.5 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {{ auth.user.name }}
      </p>
      <p class="mb-3 truncate text-xs text-zinc-500 dark:text-zinc-400">
        {{ auth.user?.email }}
      </p>

      <RouterLink
        v-if="settingsTo !== undefined"
        :to="settingsTo"
        class="mb-1 block rounded-[var(--finbar-radius-sm)] px-2 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80"
        role="menuitem"
        @click="close"
      >
        Instellingen
      </RouterLink>

      <FinbarButton
        variant="ghost"
        size="sm"
        type="button"
        class="mt-2 w-full justify-center"
        role="menuitem"
        @click="onLogout"
      >
        Uitloggen
      </FinbarButton>
    </div>
  </div>
</template>
