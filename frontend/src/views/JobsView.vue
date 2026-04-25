<script setup lang="ts">
import TodayAddToolbarButton from "@/components/TodayAddToolbarButton.vue";
import { JOB_STATUS_LABELS, useJobsStore } from "@/stores/jobs";
import { onMounted } from "vue";
import { RouterLink } from "vue-router";

defineOptions({ name: "JobsView" });

const jobs = useJobsStore();

onMounted(() => {
  void jobs.fetchList();
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-xl font-semibold text-zinc-900 dark:text-white">Projecten</h1>
      <TodayAddToolbarButton
        pill
        label="Nieuw project"
        to="/jobs/new"
      />
    </div>

    <p
      v-if="jobs.listLoading"
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Laden…
    </p>
    <p
      v-else-if="jobs.listError"
      class="text-sm text-red-400"
    >
      {{ jobs.listError }}
    </p>
    <ul
      v-else-if="jobs.list.length"
      class="finbar-list-shell"
    >
      <li
        v-for="j in jobs.list"
        :key="j.id"
      >
        <RouterLink
          :to="`/jobs/${j.id}`"
          class="finbar-list-row text-zinc-900 dark:text-zinc-100"
        >
          <span class="font-medium">{{ j.name }}</span>
          <span class="text-xs text-zinc-600 dark:text-zinc-500">
            {{ JOB_STATUS_LABELS[j.status] }}
            <span
              v-if="j.address"
              class="ml-2 text-zinc-600 dark:text-zinc-400"
            >· {{ j.address }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>
    <p
      v-else
      class="text-sm text-zinc-600 dark:text-zinc-300"
    >
      Nog geen projecten.
      <RouterLink
        to="/jobs/new"
        class="finbar-link underline-offset-2 hover:underline"
      >
        Maak er een
      </RouterLink>.
    </p>
  </div>
</template>
