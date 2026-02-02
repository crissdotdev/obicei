import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import type { Habit } from '../models/habit';
import type { HabitEntry } from '../models/habit-entry';
import { toDateString } from '../lib/date-utils';
import { scheduleReminder, cancelReminder, syncAllRemindersToServer } from '../lib/notifications';

// ─── Reactive Hooks ──────────────────────────────────────────

let globalRefreshCounter = 0;
const listeners = new Set<() => void>();

function triggerRefresh() {
  globalRefreshCounter++;
  listeners.forEach((fn) => fn());
}

function useRefreshTrigger() {
  const [, setCount] = useState(0);
  useEffect(() => {
    const handler = () => setCount((c) => c + 1);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  useRefreshTrigger();

  useEffect(() => {
    let cancelled = false;
    api.get<Habit[]>('/habits').then((data) => {
      if (!cancelled) setHabits(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [globalRefreshCounter]);

  return { habits };
}

export function useHabit(id: string | undefined) {
  const { habits } = useHabits();
  return useMemo(() => habits.find((h) => h.id === id), [habits, id]);
}

export function useEntriesForDate(date: Date, habits: Habit[]) {
  const dateStr = toDateString(date);
  const habitIds = useMemo(() => habits.map((h) => h.id), [habits]);

  return useEntriesForHabitIds(habitIds, dateStr);
}

function useEntriesForHabitIds(habitIds: string[], dateStr: string) {
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  useRefreshTrigger();

  useEffect(() => {
    if (habitIds.length === 0 || !dateStr) {
      setEntries([]);
      return;
    }

    let cancelled = false;

    // Single API call for all entries on this date
    api.get<HabitEntry[]>(`/habits/entries/by-date/${dateStr}`)
      .then((allEntries) => {
        if (!cancelled) {
          const filtered = allEntries.filter((e) => habitIds.includes(e.habitId));
          setEntries(filtered);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [habitIds.join(','), dateStr, globalRefreshCounter]);

  return entries;
}

export function useAllEntries(habitId: string) {
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  useRefreshTrigger();

  useEffect(() => {
    if (!habitId) return;
    let cancelled = false;
    api.get<HabitEntry[]>(`/habits/${habitId}/entries`).then((data) => {
      if (!cancelled) {
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        setEntries(sorted);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [habitId, globalRefreshCounter]);

  return entries;
}

// ─── Mutations ───────────────────────────────────────────────

export async function createHabit(data: {
  name: string;
  type: 'binary' | 'numeric';
  unit?: string;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}): Promise<void> {
  const id = crypto.randomUUID().replace(/-/g, '');

  await api.post('/habits', {
    id,
    name: data.name.trim(),
    type: data.type,
    unit: data.type === 'numeric' ? (data.unit?.trim() || undefined) : undefined,
    createdAt: toDateString(new Date()),
    reminderEnabled: data.reminderEnabled,
    reminderHour: data.reminderHour,
    reminderMinute: data.reminderMinute,
    sortOrder: Date.now(),
  });

  if (data.reminderEnabled) {
    scheduleReminder(id, data.name, data.reminderHour, data.reminderMinute);
  }

  syncAllRemindersToServer();
  triggerRefresh();
}

export async function updateHabit(
  id: string,
  data: {
    name: string;
    unit?: string;
    reminderEnabled: boolean;
    reminderHour: number;
    reminderMinute: number;
  },
): Promise<void> {
  await api.put(`/habits/${id}`, {
    name: data.name.trim(),
    unit: data.unit?.trim() || null,
    reminderEnabled: data.reminderEnabled,
    reminderHour: data.reminderHour,
    reminderMinute: data.reminderMinute,
  });

  if (data.reminderEnabled) {
    scheduleReminder(id, data.name, data.reminderHour, data.reminderMinute);
  } else {
    cancelReminder(id);
  }

  syncAllRemindersToServer();
  triggerRefresh();
}

export async function deleteHabit(id: string): Promise<void> {
  cancelReminder(id);
  await api.delete(`/habits/${id}`);
  syncAllRemindersToServer();
  triggerRefresh();
}

export async function toggleBinary(habitId: string, date: Date, currentCompleted?: boolean): Promise<void> {
  const dateStr = toDateString(date);
  const newCompleted = !(currentCompleted ?? false);

  await api.put(`/habits/${habitId}/entries/${dateStr}`, {
    completed: newCompleted,
    value: null,
  });

  triggerRefresh();
}

export async function setNumericValue(
  habitId: string,
  value: number,
  date: Date,
): Promise<void> {
  const dateStr = toDateString(date);
  await api.put(`/habits/${habitId}/entries/${dateStr}`, {
    completed: true,
    value,
  });
  triggerRefresh();
}

export async function clearNumericValue(habitId: string, date: Date): Promise<void> {
  const dateStr = toDateString(date);
  await api.put(`/habits/${habitId}/entries/${dateStr}`, {
    completed: false,
    value: null,
  });
  triggerRefresh();
}

export function useCompletionStatus(date: Date, habits: Habit[]) {
  const dateStr = toDateString(date);
  const habitIds = useMemo(
    () => habits.filter((h) => !h.isArchived && h.createdAt <= dateStr).map((h) => h.id),
    [habits, dateStr],
  );

  const entries = useEntriesForHabitIds(habitIds, dateStr);

  return useMemo(() => {
    if (habitIds.length === 0) return false;
    return habitIds.every((hid) => entries.some((e) => e.habitId === hid && e.completed));
  }, [habitIds, entries]);
}
