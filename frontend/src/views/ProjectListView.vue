<script setup lang="ts">
import TodayAddToolbarButton from "@/components/TodayAddToolbarButton.vue";
import { FinbarBadge } from "@/components/ui";
import {
  JOB_STATUS_LABELS,
  type Job,
  type JobStatus,
  useJobsStore,
} from "@/stores/jobs";
import { computed, onMounted } from "vue";
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

/** Actief en planning; afgerond en gearchiveerd alleen via Archief. */
const primaryJobs = computed(() => [
  ...activeJobs.value,
  ...planningJobs.value,
]);

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
          v-if="archivedJobs.length === 0 && completedJobs.length === 0"
          class="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Nog geen projecten. Maak er een aan om te beginnen.
        </p>
        <p
          v-else
          class="text-sm text-zinc-600 dark:text-zinc-400"
        >
          Geen actieve of geplande projecten. Afgeronde en gearchiveerde projecten vind je onder
          <RouterLink
            :to="{ name: 'project-archive' }"
            class="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-200 dark:hover:text-white"
          >
            Archief
          </RouterLink>
          .
        </p>
      </template>

      <RouterLink
        v-for="j in primaryJobs"
        :key="j.id"
        :to="{ name: 'project-planning-today', params: { projectId: j.id } }"
        class="flex w-full items-start gap-3 rounded-[var(--finbar-radius-lg)] border border-zinc-300 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80"
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

      <RouterLink
        :to="{ name: 'project-archive' }"
        class="mt-4 inline-flex text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Archief
      </RouterLink>
    </div>
  </div>
</template>
