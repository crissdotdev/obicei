export function hapticMedium(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(15);
  }
}

export function hapticSuccess(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate([10, 50, 10]);
  }
}
