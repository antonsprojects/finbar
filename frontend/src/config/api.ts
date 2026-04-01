/** Backend origin for `fetch` (no trailing slash). */
const DEFAULT_API = "http://127.0.0.1:3001";

function trimTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw === undefined || raw === "") {
    if (import.meta.env.DEV) {
      console.warn("[finbar] VITE_API_BASE_URL unset; using default", DEFAULT_API);
    }
    return DEFAULT_API;
  }
  return trimTrailingSlashes(raw);
}
