<script setup lang="ts">
import TodayAddToolbarButton from "@/components/TodayAddToolbarButton.vue";
import { FinbarBadge } from "@/components/ui";
import {
  JOB_STATUS_LABELS,
  type Job,
  type JobStatus,
  useJobsStore,
} from "@/stores/jobs";
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";

defineOptions({ name: "ProjectListView" });

const jobs = useJobsStore();

function sortByName(a: Job, b: Job) {
  return a.name.localeCompare(b.name, "nl", { sensitivity: "base" });
}

const activeJobs = computed(() =>
  jobs.list.filter((j) => j.status === "ACTIVE").sort(sortByName),
);
const planningJobs = computed(() =>
  jobs.list.filter((j) => j.status === "PLANNING").sort(sortByName),
);
const archivedJobs = computed(() =>
  jobs.list.filter((j) => j.status === "ARCHIVED").sort(sortByName),
);
const completedJobs = computed(() =>
  jobs.list.filter((j) => j.status === "COMPLETED").sort(sortByName),
);

const primaryJobs = computed(() => [
  ...activeJobs.value,
  ...planningJobs.value,
]);

/** Sectie alleen tonen als er minstens één project in die status is. */
const showAfgerondSection = computed(() => completedJobs.value.length > 0);
const showGearchiveerdSection = computed(() => archivedJobs.value.length > 0);

const completedOpen = ref(false);
const archivedOpen = ref(false);

const jobCardClass =
  "flex w-full items-start gap-3 rounded-[var(--finbar-radius-lg)] border border-zinc-300 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80";

function statusBadgeVariant(
  status: JobStatus,
): "neutral" | "success" | "warning" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PLANNING":
      return "warning";
    default:
      return "neutral";
  }
}

onMounted(() => {
  void jobs.fetchList();
});
</script>

<template>
  <div class="mx-auto max-w-lg pt-0 pb-8 sm:py-10">
    <header class="mb-4 sm:mb-10">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          Projecten
        </h1>
        <TodayAddToolbarButton
          pill
          label="Nieuw project"
          :to="{ name: 'project-new' }"
        />
      </div>
    </header>

    <p
      v-if="jobs.listLoading"
      class="text-sm text-zinc-600 dark:text-zinc-400"
    >
      Projecten laden…
    </p>
    <p
      v-else-if="jobs.listError"
      class="text-sm text-red-400"
    >
      {{ jobs.listError }}
    </p>

    <div
      v-else
      class="flex flex-col gap-3"
    >
      <template v-if="primaryJobs.length === 0">
        <p
          v-if="!showAfgerondSection && !showGearchiveerdSection"
          class="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Nog geen projecten. Maak er een aan om te beginnen.
        </p>
        <p
          v-else-if="showAfgerondSection && showGearchiveerdSection"
          class="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Geen actieve of geplande projecten. Afgeronde en gearchiveerde projecten staan in de secties hieronder.
        </p>
        <p
          v-else-if="showAfgerondSection"
          class="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Geen actieve of geplande projecten. Afgeronde projecten staan in de sectie hieronder.
        </p>
        <p
          v-else
          class="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Geen actieve of geplande projecten. Gearchiveerde projecten staan in de sectie hieronder.
        </p>
      </template>

      <RouterLink
        v-for="j in primaryJobs"
        :key="j.id"
        :to="{ name: 'project-planning-today', params: { projectId: j.id } }"
        :class="jobCardClass"
      >
        <div class="min-w-0 flex-1">
          <span class="block text-base font-medium text-zinc-900 dark:text-zinc-100">{{
            j.name
          }}</span>
          <span
            v-if="j.address"
            class="mt-1.5 block truncate text-xs leading-snug text-zinc-600 dark:text-zinc-400"
            :title="j.address"
          >{{ j.address }}</span>
        </div>
        <FinbarBadge
          :variant="statusBadgeVariant(j.status)"
          class="shrink-0"
        >
          {{ JOB_STATUS_LABELS[j.status] }}
        </FinbarBadge>
      </RouterLink>

      <!-- Afgerond (ingeklapt standaard); alleen bij ≥1 afgerond project -->
      <div
        v-if="showAfgerondSection"
        class="mt-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"
      >
        <button
          id="projecten-afgerond-knop"
          type="button"
          class="flex w-full cursor-pointer items-center justify-start gap-2 border-0 bg-transparent p-0 text-left text-inherit focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50"
          :aria-expanded="completedOpen"
          aria-controls="projecten-afgerond-lijst"
          @click="completedOpen = !completedOpen"
        >
          <svg
            class="size-4 shrink-0 text-zinc-500 transition-transform dark:text-zinc-400"
            :class="completedOpen ? 'rotate-90' : ''"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">Afgerond</span>
          <span class="text-xs text-zinc-500 dark:text-zinc-500">({{ completedJobs.length }})</span>
        </button>
        <div
          v-show="completedOpen"
          id="projecten-afgerond-lijst"
          class="mt-3 flex flex-col gap-3"
        >
          <RouterLink
            v-for="j in completedJobs"
            :key="j.id"
            :to="{ name: 'project-planning-today', params: { projectId: j.id } }"
            :class="jobCardClass"
          >
            <div class="min-w-0 flex-1">
              <span class="block text-base font-medium text-zinc-900 dark:text-zinc-100">{{
                j.name
              }}</span>
              <span
                v-if="j.address"
                class="mt-1.5 block truncate text-xs leading-snug text-zinc-600 dark:text-zinc-400"
                :title="j.address"
              >{{ j.address }}</span>
            </div>
            <FinbarBadge
              variant="neutral"
              class="shrink-0"
            >
              {{ JOB_STATUS_LABELS[j.status] }}
            </FinbarBadge>
          </RouterLink>
        </div>
      </div>

      <!-- Gearchiveerd (ingeklapt standaard); alleen bij ≥1 gearchiveerd project -->
      <div
        v-if="showGearchiveerdSection"
        class="mt-2 border-t border-zinc-200 pt-4 dark:border-zinc-800"
      >
        <button
          id="projecten-archief-knop"
          type="button"
          class="flex w-full cursor-pointer items-center justify-start gap-2 border-0 bg-transparent p-0 text-left text-inherit focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 dark:focus-visible:ring-zinc-500/50"
          :aria-expanded="archivedOpen"
          aria-controls="projecten-archief-lijst"
          @click="archivedOpen = !archivedOpen"
        >
          <svg
            class="size-4 shrink-0 text-zinc-500 transition-transform dark:text-zinc-400"
            :class="archivedOpen ? 'rotate-90' : ''"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">Gearchiveerd</span>
          <span class="text-xs text-zinc-500 dark:text-zinc-500">({{ archivedJobs.length }})</span>
        </button>
        <div
          v-show="archivedOpen"
          id="projecten-archief-lijst"
          class="mt-3 flex flex-col gap-3"
        >
          <RouterLink
            v-for="j in archivedJobs"
            :key="j.id"
            :to="{ name: 'project-planning-today', params: { projectId: j.id } }"
            :class="jobCardClass"
          >
            <div class="min-w-0 flex-1">
              <span class="block text-base font-medium text-zinc-900 dark:text-zinc-100">{{
                j.name
              }}</span>
              <span
                v-if="j.address"
                class="mt-1.5 block truncate text-xs leading-snug text-zinc-600 dark:text-zinc-400"
                :title="j.address"
              >{{ j.address }}</span>
            </div>
            <FinbarBadge
              variant="neutral"
              class="shrink-0"
            >
              {{ JOB_STATUS_LABELS[j.status] }}
            </FinbarBadge>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
