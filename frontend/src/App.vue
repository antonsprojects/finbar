<script setup lang="ts">
import FinbarShellNavMenu from "@/components/FinbarShellNavMenu.vue";
import { FinbarAccountMenu } from "@/components/ui";
import { appBrandName } from "@/lib/accountDisplay";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { computed, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

const auth = useAuthStore();
const preferences = usePreferencesStore();
const route = useRoute();
const router = useRouter();

const projectShell = computed(() =>
  route.matched.some((r) => r.meta.projectShell === true),
);

const hideRootChrome = computed(
  () => route.meta.hideRootChrome === true,
);

const adminRoute = computed(() => route.meta.requiresAdmin === true);

/** Merk in de globale header: bedrijfsnaam of anders Finbar. */
const globalBrandTitle = computed(() =>
  auth.user ? appBrandName(auth.user) : "Finbar",
);

watch(
  globalBrandTitle,
  (t) => {
    document.title = t;
  },
  { immediate: true },
);

const routeName = computed(() => String(route.name ?? ""));

const projectsNavActive = computed(() =>
  ["home", "project-new"].includes(routeName.value),
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

/**
 * Onder hideRootChrome: op kleine schermen standaard horizontale + bovenmarge, zodat headers
 * en FinbarCard-rondingen zichtbaar blijven. Alleen uitzonderingen (bijv. volbreed-stroom)
 * krijgen `px-0 pt-0` op mobiel.
 */
const routesWithPaddedGlobalMainMobile = new Set<string>([
  "home",
  "global-settings",
  "global-worker-new",
  "global-worker-detail",
]);

const fullBleedMainMobile = computed(
  () =>
    hideRootChrome.value &&
    !routesWithPaddedGlobalMainMobile.has(routeName.value),
);

async function stopImpersonation() {
  await auth.stopImpersonation();
  await router.push("/admin");
}
</script>

<template>
  <div
    v-if="auth.isImpersonating && auth.impersonation"
    class="border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
  >
    <div class="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Je bekijkt Finbar als
        <strong>{{ auth.impersonation.impersonatedUser.email }}</strong>.
      </span>
      <button
        type="button"
        class="self-start rounded-[var(--finbar-radius-sm)] border border-amber-700 px-2 py-1 text-xs font-medium hover:bg-amber-200 dark:border-amber-300 dark:hover:bg-amber-900 sm:self-auto"
        @click="stopImpersonation"
      >
        Stop bekijken
      </button>
    </div>
  </div>

  <!-- Project workspace: layout owns chrome -->
  <RouterView v-if="projectShell" />

  <!-- Admin workspace -->
  <div
    v-else-if="auth.user && adminRoute"
    class="finbar-app-shell"
  >
    <header class="finbar-app-header">
      <div class="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <RouterLink
          to="/admin"
          class="font-semibold tracking-tight text-[color:var(--finbar-color-text)]"
        >
          Finbar beheer
        </RouterLink>
        <FinbarAccountMenu :settings-to="{ name: 'admin' }" />
      </div>
    </header>
    <main class="flex-auto">
      <RouterView />
    </main>
  </div>

  <!-- Logged-in home / new project: title + logout only -->
  <div
    v-else-if="auth.user && hideRootChrome"
    class="finbar-app-shell"
  >
    <header class="finbar-app-header">
      <div
        class="mx-auto grid w-full max-w-5xl gap-y-2 px-4 py-3 max-sm:grid-cols-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-3"
      >
        <div
          class="col-start-1 row-start-1 flex min-w-0 flex-1 items-center gap-1 justify-self-start sm:col-start-1 sm:row-start-1"
        >
          <FinbarShellNavMenu mode="global" />
          <RouterLink
            to="/"
            class="font-semibold tracking-tight text-[color:var(--finbar-color-text)]"
          >
            {{ globalBrandTitle }}
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
        'finbar-main mx-auto w-full max-w-5xl flex-auto',
        fullBleedMainMobile
          ? 'px-0 pt-0 pb-[max(1.5rem,env(safe-area-inset-bottom,0))] sm:px-4 sm:py-6'
          : 'px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0))]',
      ]"
    >
      <RouterView />
    </main>
  </div>

  <!-- Login / register / wachtwoord: minimaal — merk + slogan, geen globale nav -->
  <div
    v-else-if="!auth.user"
    class="finbar-app-shell"
  >
    <main
      class="finbar-main mx-auto flex w-full max-w-5xl flex-auto flex-col items-center justify-center px-4 py-10 pb-[max(1.5rem,env(safe-area-inset-bottom,0))]"
    >
      <div class="mb-8 w-full text-center">
        <RouterLink
          to="/login"
          class="text-2xl font-semibold tracking-tight text-[color:var(--finbar-color-text)]"
        >
          Finbar
        </RouterLink>
        <p
          class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[color:var(--finbar-color-text-muted)]"
        >
          Eén overzicht voor je projecten, team en planning.
        </p>
      </div>
      <RouterView />
    </main>
  </div>

  <!-- Fallback (should not occur for logged-in users) -->
  <div
    v-else
    class="finbar-app-shell"
  >
    <main
      class="finbar-main mx-auto w-full max-w-5xl flex-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0))]"
    >
      <RouterView />
    </main>
  </div>
</template>
