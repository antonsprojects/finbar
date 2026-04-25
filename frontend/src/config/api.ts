/** Dev-only default when VITE_API_BASE_URL is unset. */
const DEFAULT_API_DEV = "http://127.0.0.1:3001";

function trimTrailingSlashes(s: string): string {
  return s.replace(/\/+$/, "");
}

/**
 * Public API origin (no trailing slash). In production, when unset, uses the
 * current page origin so the built SPA works behind Nginx/HTTPS; never use
 * 127.0.0.1:3001 in the browser in prod (that is the user’s machine).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw !== undefined && raw !== "") {
    return trimTrailingSlashes(raw);
  }
  if (import.meta.env.DEV) {
    console.warn(
      "[finbar] VITE_API_BASE_URL unset; using default",
      DEFAULT_API_DEV,
    );
    return DEFAULT_API_DEV;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_API_DEV;
}
