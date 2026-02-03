/**
 * Convert a local hour:minute to UTC hour:minute.
 * Uses the browser's current timezone offset (handles DST automatically).
 * Reminders are re-synced on every app load, so DST transitions self-correct.
 */
export function localToUtc(hour: number, minute: number): { hour: number; minute: number } {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  return { hour: local.getUTCHours(), minute: local.getUTCMinutes() };
}

/**
 * Convert a UTC hour:minute to local hour:minute.
 */
export function utcToLocal(hour: number, minute: number): { hour: number; minute: number } {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute));
  return { hour: utc.getHours(), minute: utc.getMinutes() };
}
