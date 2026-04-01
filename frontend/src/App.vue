<script setup lang="ts">
import { useAppStore } from "@/stores/app";
import { RouterLink, RouterView } from "vue-router";

const app = useAppStore();

const links = [
  { to: "/today", label: "Today" },
  { to: "/week", label: "Week" },
  { to: "/jobs", label: "Jobs" },
  { to: "/workers", label: "Workers" },
  { to: "/settings", label: "Settings" },
  { to: "/login", label: "Login" },
] as const;
</script>

<template>
  <div class="flex min-h-svh flex-col bg-zinc-950 text-zinc-100">
    <header
      class="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md"
    >
      <div class="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
        <RouterLink to="/today" class="mr-2 font-semibold tracking-tight text-white">
          Finbar
        </RouterLink>
        <nav class="flex flex-wrap items-center gap-1">
          <RouterLink
            v-for="item in links"
            :key="item.to"
            :to="item.to"
            class="finbar-nav-link"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <RouterView />
    </main>

    <footer class="border-t border-zinc-800 py-3 text-center text-xs text-zinc-500">
      API:
      <span class="font-mono text-zinc-400">{{ app.apiBaseUrl }}</span>
    </footer>
  </div>
</template>
