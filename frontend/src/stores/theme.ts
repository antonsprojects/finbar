import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

const STORAGE_KEY = "finbar-color-scheme";

export type ColorSchemePreference = "light" | "dark" | "system";

function readStored(): ColorSchemePreference {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export const useThemeStore = defineStore("theme", () => {
  const preference = ref<ColorSchemePreference>("system");
  const systemDark = ref(false);

  const effectiveDark = computed(() => {
    if (preference.value === "dark") return true;
    if (preference.value === "light") return false;
    return systemDark.value;
  });

  let initialized = false;
  let mq: MediaQueryList | null = null;

  function onMq(e: MediaQueryListEvent) {
    systemDark.value = e.matches;
  }

  function applyDom() {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", effectiveDark.value);
  }

  function init() {
    if (initialized || typeof window === "undefined") return;
    initialized = true;
    preference.value = readStored();
    mq = window.matchMedia("(prefers-color-scheme: dark)");
    systemDark.value = mq.matches;
    mq.addEventListener("change", onMq);
    watch([preference, systemDark], applyDom, { immediate: true });
  }

  function setPreference(next: ColorSchemePreference) {
    preference.value = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }

  return {
    preference,
    effectiveDark,
    init,
    setPreference,
  };
});
