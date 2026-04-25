<script setup lang="ts">
import FinbarShellNavMenu from "@/components/FinbarShellNavMenu.vue";
import { FinbarAccountMenu, FinbarThemeToggle } from "@/components/ui";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { computed, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

const auth = useAuthStore();
const preferences = usePreferencesStore();
const route = useRoute();

const projectShell = computed(() =>
  route.matched.some((r) => r.meta.projectShell === true),
);

const hideRootChrome = computed(
  () => route.meta.hideRootChrome === true,
);

const routeName = computed(() => String(route.name ?? ""));

const projectsNavActive = computed(() =>
  [
    "home",
    "project-archive",
    "project-new",
    "global-settings",
  ].includes(routeName.value),
);

const workersNavActive = computed(() =>
  [
    "global-workers",
    "global-worker-new",
    "global-worker-detail",
  ].includes(routeName.value),
);

watch(
  () => auth.user,
  () => {
    preferences.syncFromAuth();
  },
  { immediate: true },
);

const navPillActive =
  "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100";
const navPillIdle =
  "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200";

/** Home (Projecten-lijst) houdt horizontale main-padding; overige globale routes: smal = tot-aan-rand. */
const fullBleedMainMobile = computed(
  () => hideRootChrome.value && routeName.value !== "home",
);
</script>

<template>
  <!-- Project workspace: layout owns chrome -->
  <RouterView v-if="projectShell" />

  <!-- Logged-in home / new project: title + logout only -->
  <div
    v-else-if="auth.user && hideRootChrome"
    class="flex min-h-svh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
  >
    <header
      class="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950"
    >
      <div
        class="mx-auto grid w-full max-w-5xl gap-y-2 px-4 py-3 max-sm:grid-cols-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-3"
      >
        <div
          class="col-start-1 row-start-1 flex min-w-0 flex-1 items-center gap-1 justify-self-start sm:col-start-1 sm:row-start-1"
        >
          <FinbarShellNavMenu mode="global" />
          <RouterLink
            to="/"
            class="font-semibold tracking-tight text-zinc-900 dark:text-white"
          >
            Finbar
          </RouterLink>
        </div>

        <nav
          class="row-start-2 col-span-2 flex w-full max-w-full min-w-0 justify-center justify-self-center sm:row-start-1 sm:col-span-1 sm:col-start-2"
          aria-label="Hoofdnavigatie"
        >
          <div
            class="inline-flex rounded-[var(--finbar-radius)] border border-zinc-300 bg-zinc-100/80 p-0.5 dark:border-zinc-600 dark:bg-zinc-900/60"
            role="group"
          >
            <RouterLink
              :to="{ name: 'home' }"
              class="finbar-pill-height inline-flex items-center justify-center rounded-[calc(var(--finbar-radius-sm))] px-3 text-xs font-medium transition-colors"
              :class="projectsNavActive ? navPillActive : navPillIdle"
              :aria-current="projectsNavActive ? 'page' : undefined"
            >
              Projecten
            </RouterLink>
            <RouterLink
              :to="{ name: 'global-workers' }"
              class="finbar-pill-height inline-flex items-center justify-center rounded-[calc(var(--finbar-radius-sm))] px-3 text-xs font-medium transition-colors"
              :class="workersNavActive ? navPillActive : navPillIdle"
              :aria-current="workersNavActive ? 'page' : undefined"
            >
              Netwerk
            </RouterLink>
          </div>
        </nav>

        <FinbarAccountMenu
          class="row-start-1 col-start-2 justify-self-end self-center sm:col-start-3 sm:row-start-1"
          :settings-to="{ name: 'global-settings' }"
        />
      </div>
    </header>
    <main
      :class="[
        'finbar-main mx-auto w-full max-w-5xl flex-1',
        fullBleedMainMobile
          ? 'px-0 pt-0 pb-6 sm:px-4 sm:py-6'
          : 'px-4 py-6',
      ]"
    >
      <RouterView />
    </main>
  </div>

  <!-- Login / register -->
  <div
    v-else-if="!auth.user"
    class="flex min-h-svh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
  >
    <header
      class="finbar-header sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950"
    >
      <div
        class="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-3"
      >
        <RouterLink
          to="/login"
          class="mr-2 font-semibold tracking-tight text-zinc-900 dark:text-white"
        >
          Finbar
        </RouterLink>
        <div class="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
          <FinbarThemeToggle />
          <nav class="flex flex-wrap items-center gap-1">
            <RouterLink
              to="/login"
              class="finbar-nav-link"
            >
              Inloggen
            </RouterLink>
            <RouterLink
              to="/register"
              class="finbar-nav-link"
            >
              Registreren
            </RouterLink>
          </nav>
        </div>
      </div>
    </header>
    <main class="finbar-main mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <RouterView />
    </main>
  </div>

  <!-- Fallback (should not occur for logged-in users) -->
  <div
    v-else
    class="flex min-h-svh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
  >
    <main class="finbar-main mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>
