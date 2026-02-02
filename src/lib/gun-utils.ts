/**
 * Generate a unique ID compatible with Gun.js graph keys.
 */
export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
