import { useMemo } from 'react';
import type { HabitEntry } from '../models/habit-entry';
import { startOfDay, daysBetween, fromDateString, toDateString, daysAgo } from '../lib/date-utils';

export function useCurrentStreak(entries: HabitEntry[]): number {
  return useMemo(() => {
    const completedDates = entries
      .filter((e) => e.completed)
      .map((e) => fromDateString(e.date))
      .sort((a, b) => b.getTime() - a.getTime());

    if (completedDates.length === 0) return 0;

    const today = startOfDay(new Date());
    const todayStr = toDateString(today);

    // Check if today is in the list
    let checkDate: Date;
    if (completedDates.some((d) => toDateString(d) === todayStr)) {
      checkDate = today;
    } else {
      // Start from yesterday (grace period)
      checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
    }

    let streak = 0;
    const dateSet = new Set(completedDates.map((d) => toDateString(d)));

    while (dateSet.has(toDateString(checkDate))) {
      streak++;
      checkDate = new Date(checkDate);
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }, [entries]);
}

export function useLongestStreak(entries: HabitEntry[]): number {
  return useMemo(() => {
    const completedDates = entries
      .filter((e) => e.completed)
      .map((e) => fromDateString(e.date))
      .sort((a, b) => a.getTime() - b.getTime());

    if (completedDates.length === 0) return 0;

    let longest = 1;
    let current = 1;

    for (let i = 1; i < completedDates.length; i++) {
      const diff = daysBetween(completedDates[i - 1], completedDates[i]);
      if (diff === 1) {
        current++;
      } else if (diff > 1) {
        current = 1;
      }
      // diff === 0 means duplicate day, ignore
      longest = Math.max(longest, current);
    }

    return longest;
  }, [entries]);
}

export function useCompletionRate(entries: HabitEntry[], createdAt: string): number {
  return useMemo(() => {
    const createdDate = fromDateString(createdAt);
    const today = startOfDay(new Date());
    const totalDays = Math.max(1, daysBetween(createdDate, today) + 1);
    const completedDays = entries.filter((e) => e.completed).length;
    return Math.round((completedDays / totalDays) * 100);
  }, [entries, createdAt]);
}

export function useCompletedDatesSet(entries: HabitEntry[]): Set<string> {
  return useMemo(() => {
    return new Set(
      entries.filter((e) => e.completed).map((e) => e.date)
    );
  }, [entries]);
}

export function useNumericEntries(
  entries: HabitEntry[],
  days: number
): HabitEntry[] {
  return useMemo(() => {
    const cutoff = toDateString(daysAgo(days));
    return entries
      .filter((e) => e.value != null && e.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, days]);
}

export function useNumericStats(filteredEntries: HabitEntry[]): {
  average: number;
  min: number;
  max: number;
} {
  return useMemo(() => {
    const values = filteredEntries
      .map((e) => e.value)
      .filter((v): v is number => v != null);

    if (values.length === 0) {
      return { average: 0, min: 0, max: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }, [filteredEntries]);
}
