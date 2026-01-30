import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import type { Habit } from '../models/habit';
import { toDateString } from '../lib/date-utils';
import { scheduleReminder, cancelReminder } from '../lib/notifications';

export function useHabits() {
  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.isArchived).sortBy('sortOrder'),
    []
  );

  return { habits: habits ?? [] };
}

export function useEntriesForDate(date: Date) {
  const dateStr = toDateString(date);
  const entries = useLiveQuery(
    () => db.entries.where('date').equals(dateStr).toArray(),
    [dateStr]
  );
  return entries ?? [];
}

export function useAllEntries(habitId: string) {
  const entries = useLiveQuery(
    () => db.entries.where('habitId').equals(habitId).toArray(),
    [habitId]
  );
  return entries ?? [];
}

export async function createHabit(data: {
  name: string;
  type: 'binary' | 'numeric';
  unit?: string;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}): Promise<void> {
  const count = await db.habits.count();
  const habit: Habit = {
    id: uuidv4(),
    name: data.name.trim(),
    type: data.type,
    unit: data.type === 'numeric' ? data.unit?.trim() : undefined,
    createdAt: toDateString(new Date()),
    reminderEnabled: data.reminderEnabled,
    reminderHour: data.reminderHour,
    reminderMinute: data.reminderMinute,
    sortOrder: count,
    isArchived: false,
  };
  await db.habits.add(habit);

  if (data.reminderEnabled) {
    scheduleReminder(habit.id, habit.name, data.reminderHour, data.reminderMinute);
  }
}

export async function updateHabit(
  id: string,
  data: {
    name: string;
    unit?: string;
    reminderEnabled: boolean;
    reminderHour: number;
    reminderMinute: number;
  }
): Promise<void> {
  await db.habits.update(id, {
    name: data.name.trim(),
    unit: data.unit?.trim(),
    reminderEnabled: data.reminderEnabled,
    reminderHour: data.reminderHour,
    reminderMinute: data.reminderMinute,
  });

  if (data.reminderEnabled) {
    scheduleReminder(id, data.name, data.reminderHour, data.reminderMinute);
  } else {
    cancelReminder(id);
  }
}

export async function deleteHabit(id: string): Promise<void> {
  cancelReminder(id);
  await db.entries.where('habitId').equals(id).delete();
  await db.habits.delete(id);
}

export async function toggleBinary(habitId: string, date: Date): Promise<void> {
  const dateStr = toDateString(date);
  const entry = await db.entries.where({ habitId, date: dateStr }).first();

  if (entry) {
    await db.entries.update(entry.id, { completed: !entry.completed });
  } else {
    await db.entries.add({
      id: uuidv4(),
      habitId,
      date: dateStr,
      completed: true,
    });
  }
}

export async function setNumericValue(
  habitId: string,
  value: number,
  date: Date
): Promise<void> {
  const dateStr = toDateString(date);
  const entry = await db.entries.where({ habitId, date: dateStr }).first();

  if (entry) {
    await db.entries.update(entry.id, { value, completed: true });
  } else {
    await db.entries.add({
      id: uuidv4(),
      habitId,
      date: dateStr,
      completed: true,
      value,
    });
  }
}

export async function clearNumericValue(habitId: string, date: Date): Promise<void> {
  const dateStr = toDateString(date);
  const entry = await db.entries.where({ habitId, date: dateStr }).first();

  if (entry) {
    await db.entries.update(entry.id, { value: undefined, completed: false });
  }
}

export function useCompletionStatus(date: Date, habits: Habit[]) {
  const dateStr = toDateString(date);
  const entries = useLiveQuery(
    () => db.entries.where('date').equals(dateStr).toArray(),
    [dateStr]
  );

  if (!entries || habits.length === 0) return false;

  const activeHabits = habits.filter((h) => !h.isArchived);
  if (activeHabits.length === 0) return false;

  // Check habits that existed on this date
  const habitsOnDate = activeHabits.filter(
    (h) => h.createdAt <= dateStr
  );
  if (habitsOnDate.length === 0) return false;

  return habitsOnDate.every((habit) =>
    entries.some((e) => e.habitId === habit.id && e.completed)
  );
}
