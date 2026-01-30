export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysAgo(days: number): Date {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toDateString(date: Date): string {
  const d = startOfDay(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDateString(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / msPerDay);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getWeekdayLetter(date: Date): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
}

export function getSundayOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function getSaturdayOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d;
}

export function formatMediumDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatChartDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getMonthAbbr(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short' });
}

export function getFullWeekday(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isFuture(date: Date): boolean {
  return startOfDay(date) > startOfDay(new Date());
}
