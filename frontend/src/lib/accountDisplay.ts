import type { AuthUser } from "@/stores/auth";

/** “Voornaam Achternaam” voor menu; leeg → e-mail. */
export function accountDisplayName(u: AuthUser | null): string {
  if (!u) return "";
  const f = u.firstName?.trim() ?? "";
  const l = u.lastName?.trim() ?? "";
  const full = [f, l].filter(Boolean).join(" ").trim();
  return full.length > 0 ? full : u.email;
}

/** App-merk in de globale header; leeg = productnaam Finbar. */
export function appBrandName(u: AuthUser | null): string {
  const c = u?.companyName?.trim();
  return c && c.length > 0 ? c : "Finbar";
}
