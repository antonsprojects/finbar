/** Volledige weergavenaam voor API-responses (weergave + sortering). */
export function workerDisplayName(w: {
  firstName: string;
  lastName: string;
}): string {
  const a = w.firstName.trim();
  const b = w.lastName.trim();
  if (a && b) return `${a} ${b}`;
  return a || b;
}
