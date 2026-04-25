import type { UserPreference } from "@prisma/client";

export type PreferenceJson = {
  largeTextMode: boolean;
  preferredView: string | null;
};

export function preferenceJson(
  p: UserPreference | null,
): PreferenceJson {
  if (!p) {
    return { largeTextMode: false, preferredView: null };
  }
  return {
    largeTextMode: p.largeTextMode,
    preferredView: p.preferredView,
  };
}
