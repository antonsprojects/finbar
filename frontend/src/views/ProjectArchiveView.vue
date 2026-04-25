<script setup lang="ts">
import { type Job, useJobsStore } from "@/stores/jobs";
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";

defineOptions({ name: "ProjectArchiveView" });

const jobs = useJobsStore();

function sortByName(a: Job, b: Job) {
  return a.name.localeCompare(b.name, "nl", { sensitivity: "base" });
}

const completedJobs = computed(() =>
  jobs.list.filter((j) => j.status === "COMPLETED").sort(sortByName),
);
const archivedJobs = computed(() =>
  jobs.list.filter((j) => j.status === "ARCHIVED").sort(sortByName),
);

const archiveEmpty = computed(
  () => completedJobs.value.length === 0 && archivedJobs.value.length === 0,
);

onMounted(() => {
  void jobs.fetchList();
});
</script>

<template>
  <div class="mx-auto max-w-lg py-10">
    <header class="mb-10">
      <RouterLink
        :to="{ name: 'home' }"
        class="mb-4 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Projecten
      </RouterLink>
      <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
        Archief
      </h1>
      <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Afgeronde en gearchiveerde projecten.
      </p>
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
      class="flex flex-col gap-8"
    >
      <p
        v-if="archiveEmpty"
        class="text-sm text-zinc-600 dark:text-zinc-400"
      >
        Er staan nog geen projecten in het archief.
      </p>

      <section v-if="completedJobs.length > 0">
        <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Afgerond
        </h2>
        <div class="flex flex-col gap-3">
          <RouterLink
            v-for="j in completedJobs"
            :key="j.id"
            :to="{ name: 'project-planning-today', params: { projectId: j.id } }"
            class="block w-full rounded-[var(--finbar-radius-lg)] border border-zinc-300 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80"
          >
            <span class="block text-base font-medium text-zinc-900 dark:text-zinc-100">{{
              j.name
            }}</span>
            <span
              v-if="j.address"
              class="mt-1.5 block truncate text-xs leading-snug text-zinc-600 dark:text-zinc-400"
              :title="j.address"
            >{{ j.address }}</span>
          </RouterLink>
        </div>
      </section>

      <section v-if="archivedJobs.length > 0">
        <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Gearchiveerd
        </h2>
        <div class="flex flex-col gap-3">
          <RouterLink
            v-for="j in archivedJobs"
            :key="j.id"
            :to="{ name: 'project-planning-today', params: { projectId: j.id } }"
            class="block w-full rounded-[var(--finbar-radius-lg)] border border-zinc-300 bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/70 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-800/80"
          >
            <span class="block text-base font-medium text-zinc-900 dark:text-zinc-100">{{
              j.name
            }}</span>
            <span
              v-if="j.address"
              class="mt-1.5 block truncate text-xs leading-snug text-zinc-600 dark:text-zinc-400"
              :title="j.address"
            >{{ j.address }}</span>
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>
