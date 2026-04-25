<script setup lang="ts">
import { useJobsStore } from "@/stores/jobs";
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

defineOptions({ name: "FinbarShellNavMenu" });

const props = defineProps<{
  /** `global` = dashboard-shell (geen projectinstellingen); `project` = binnen een project. */
  mode: "global" | "project";
  /** Verplicht bij `mode: 'project'` (huidig project-id). */
  projectId?: string;
}>();

const route = useRoute();
const jobs = useJobsStore();

const projectSettingsTo = computed(() =>
  props.projectId
    ? {
        name: "project-settings" as const,
        params: { projectId: props.projectId },
      }
    : null,
);

const activeJobsForSwitcher = computed(() =>
  jobs.list.filter(
    (j) => j.status !== "ARCHIVED" && j.status !== "COMPLETED",
  ),
);

const ROUTES_KEEP_ON_PROJECT_SWITCH = new Set([
  "project-planning-today",
  "project-begroting",
  "project-workers",
  "project-team-pick",
  "project-task-new",
  "project-task-detail",
  "project-settings",
]);

function projectSwitchTo(jobId: string) {
  if (props.mode === "global") {
    return {
      name: "project-planning-today" as const,
      params: { projectId: jobId },
    };
  }
  const n = route.name;
  if (typeof n === "string" && ROUTES_KEEP_ON_PROJECT_SWITCH.has(n)) {
    return { name: n, params: { projectId: jobId } };
  }
  return {
    name: "project-planning-today" as const,
    params: { projectId: jobId },
  };
}

const triggerId = computed(() =>
  props.mode === "global"
    ? "finbar-shell-menu-trigger-global"
    : "finbar-shell-menu-trigger-project",
);
const menuId = computed(() =>
  props.mode === "global"
    ? "finbar-shell-menu-global"
    : "finbar-shell-menu-project",
);

const projectMenuOpen = ref(false);
const projectMenuRoot = ref<HTMLElement | null>(null);

function closeProjectMenu() {
  projectMenuOpen.value = false;
}

function onDocPointerDown(ev: MouseEvent | PointerEvent) {
  const el = projectMenuRoot.value;
  if (!el || !projectMenuOpen.value) return;
  const t = ev.target;
  if (t instanceof Node && el.contains(t)) return;
  closeProjectMenu();
}

watch(projectMenuOpen, (open) => {
  if (open) {
    if (jobs.list.length === 0 && !jobs.listLoading) {
      void jobs.fetchList();
    }
    void nextTick().then(() => {
      if (!projectMenuOpen.value) return;
      document.addEventListener("pointerdown", onDocPointerDown, true);
    });
  } else {
    document.removeEventListener("pointerdown", onDocPointerDown, true);
  }
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocPointerDown, true);
});
</script>

<template>
  <div
    ref="projectMenuRoot"
    class="relative flex min-w-0 items-center gap-1"
  >
    <button
      :id="triggerId"
      type="button"
      class="flex size-8 shrink-0 items-center justify-center rounded-md p-0 text-zinc-600 transition-colors hover:bg-zinc-200/80 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      :aria-expanded="projectMenuOpen"
      aria-haspopup="menu"
      :aria-controls="menuId"
      aria-label="Menu"
      @click.stop="projectMenuOpen = !projectMenuOpen"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <slot />

    <div
      v-if="projectMenuOpen"
      :id="menuId"
      class="absolute top-full left-0 z-30 mt-1 max-h-[min(22rem,70vh)] min-w-[12rem] max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      role="menu"
      aria-label="Menu"
      @click.stop
    >
      <template v-if="projectSettingsTo">
        <RouterLink
          :to="projectSettingsTo"
          role="menuitem"
          class="block px-3 py-2 text-left text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
          @click="closeProjectMenu"
        >
          Project settings
        </RouterLink>
        <div
          class="my-1 border-b border-zinc-200 dark:border-zinc-700"
          role="separator"
        />
      </template>

      <RouterLink
        :to="{ name: 'home' }"
        role="menuitem"
        class="block px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        @click="closeProjectMenu"
      >
        Projecten
      </RouterLink>
      <RouterLink
        :to="{ name: 'global-workers' }"
        role="menuitem"
        class="block px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        @click="closeProjectMenu"
      >
        Netwerk
      </RouterLink>
      <RouterLink
        :to="{ name: 'project-archive' }"
        role="menuitem"
        class="block px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        @click="closeProjectMenu"
      >
        Archive
      </RouterLink>

      <div
        class="my-1 border-b border-zinc-200 dark:border-zinc-700"
        role="separator"
      />
      <p
        class="px-3 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500"
      >
        Projecten
      </p>

      <template v-if="jobs.listLoading">
        <p
          class="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400"
        >
          Laden…
        </p>
      </template>
      <template v-else-if="jobs.listError">
        <p
          class="px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {{ jobs.listError }}
        </p>
      </template>
      <template v-else>
        <RouterLink
          v-for="j in activeJobsForSwitcher"
          :key="j.id"
          :to="projectSwitchTo(j.id)"
          role="menuitem"
          class="block truncate px-3 py-2 text-left text-sm text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
          :class="
            mode === 'project' && projectId && j.id === projectId
              ? 'bg-zinc-100 font-medium dark:bg-zinc-800'
              : ''
          "
          :aria-current="
            mode === 'project' && projectId && j.id === projectId
              ? 'page'
              : undefined
          "
          @click="closeProjectMenu"
        >
          {{ j.name }}
        </RouterLink>
        <p
          v-if="activeJobsForSwitcher.length === 0"
          class="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400"
        >
          <span v-if="jobs.list.length > 0">Alle projecten staan in het archief.</span>
          <span v-else>Geen projecten.</span>
        </p>
      </template>
    </div>
  </div>
</template>
