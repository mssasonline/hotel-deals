/** Returns YYYY-MM-DD for the given date in the user's local timezone. */
export function localDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns YYYY-MM-DD for tomorrow in the user's local timezone. */
export function localTomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localDateISO(d);
}
