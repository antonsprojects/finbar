import { getApiBaseUrl } from "@/config/api";
import { defineStore } from "pinia";
import { computed } from "vue";

export const useAppStore = defineStore("app", () => {
  const apiBaseUrl = computed(() => getApiBaseUrl());
  return { apiBaseUrl };
});
