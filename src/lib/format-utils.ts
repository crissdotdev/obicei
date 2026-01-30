export function formatValue(value: number): string {
  if (value % 1 === 0) {
    return value.toFixed(0);
  }
  return value.toFixed(1);
}
