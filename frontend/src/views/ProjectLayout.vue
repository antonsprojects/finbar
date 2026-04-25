<script setup lang="ts">
import FinbarShellNavMenu from "@/components/FinbarShellNavMenu.vue";
import { FinbarAccountMenu } from "@/components/ui";
import { useJobsStore } from "@/stores/jobs";
import { computed, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

defineOptions({ name: "ProjectLayout" });

const route = useRoute();
const router = useRouter();
const jobs = useJobsStore();

const projectId = computed(() => route.params.projectId as string);

const jobName = computed(
  () => jobs.detailById[projectId.value]?.name ?? "",
);

watch(
  projectId,
  async (id) => {
    try {
      await jobs.fetchJob(id);
    } catch {
      await router.replace({ name: "home" });
    }
  },
  { immediate: true },
);

const nav = computed(() => {
  const pid = projectId.value;
  return [
    {
      label: "Begroting",
      to: { name: "project-begroting", params: { projectId: pid } },
      activeNames: ["project-begroting"],
    },
    {
      label: "Planning",
      to: { name: "project-planning-today", params: { projectId: pid } },
      activeNames: [
        "project-planning-today",
        "project-task-new",
        "project-task-detail",
      ],
    },
    {
      label: "Team",
      to: { name: "project-workers", params: { projectId: pid } },
      activeNames: [
        "project-workers",
        "project-team-pick",
        "project-worker-new",
        "project-worker-detail",
      ],
    },
  ] as const;
});

const navPillActive =
  "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100";
const navPillIdle =
  "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200";

function isProjectNavActive(item: { activeNames: readonly string[] }) {
  const n = String(route.name ?? "");
  return item.activeNames.includes(n);
}

</script>

<template>
  <div
    class="flex min-h-svh flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
  >
    <header
      class="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-950"
    >
      <div
        class="mx-auto grid w-full max-w-5xl gap-y-2 px-4 py-3 max-sm:grid-cols-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-3"
      >
        <div
          class="col-start-1 row-start-1 flex min-w-0 flex-1 items-center sm:col-start-1 sm:row-start-1"
        >
          <FinbarShellNavMenu
            mode="project"
            :project-id="projectId"
            class="min-w-0 flex-1 justify-start"
          >
            <span
              class="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-zinc-900 dark:text-white"
              :title="jobName || undefined"
            >
              {{ jobName }}
            </span>
          </FinbarShellNavMenu>
        </div>
        <nav
          class="row-start-2 col-span-2 flex w-full max-w-full min-w-0 justify-center justify-self-center sm:row-start-1 sm:col-span-1 sm:col-start-2"
          aria-label="Projectnavigatie"
        >
          <div
            class="inline-flex max-w-full flex-nowrap overflow-x-auto rounded-[var(--finbar-radius)] border border-zinc-300 bg-zinc-100/80 p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-zinc-600 dark:bg-zinc-900/60 [&::-webkit-scrollbar]:hidden"
            role="group"
          >
            <RouterLink
              v-for="item in nav"
              :key="item.label"
              :to="item.to"
              class="finbar-pill-height inline-flex shrink-0 items-center justify-center rounded-[calc(var(--finbar-radius-sm))] px-3 text-xs font-medium whitespace-nowrap transition-colors"
              :class="isProjectNavActive(item) ? navPillActive : navPillIdle"
              :aria-current="isProjectNavActive(item) ? 'page' : undefined"
            >
              {{ item.label }}
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
      class="finbar-main mx-auto w-full max-w-5xl flex-1 px-0 pt-0 pb-6 sm:px-4 sm:py-6"
    >
      <RouterView />
    </main>
  </div>
</template>
