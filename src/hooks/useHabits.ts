import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { user } from '../lib/db';
import { generateId } from '../lib/gun-utils';
import type { Habit } from '../models/habit';
import { toDateString } from '../lib/date-utils';
import { scheduleReminder, cancelReminder, syncAllRemindersToServer } from '../lib/notifications';

// ─── Helpers ─────────────────────────────────────────────────

/** Remove Gun.js internal metadata from a habit object. */
function cleanHabitData(data: Habit & { _?: unknown; entries?: unknown }): Habit {
  const clean = { ...data };
  delete (clean as Record<string, unknown>)._;
  delete (clean as Record<string, unknown>).entries;
  return clean as Habit;
}

/** Strip undefined values from an object before passing to Gun.put().
 *  Gun rejects undefined — use null for "no value" fields. */
function gunSafe(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = value === undefined ? null : value;
  }
  return result;
}

// ─── Reactive Hooks ──────────────────────────────────────────

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const dataRef = useRef<Map<string, Habit>>(new Map());

  useEffect(() => {
    dataRef.current = new Map();
    setHabits([]);

    const node = user.get('habits' as never).map();
    // Collect Gun event handles for per-listener cleanup (Gun .off() kills ALL listeners on a node)
    const events: Array<{ off: () => void }> = [];

    const handler = (data: (Habit & { _?: unknown }) | null, key: string, _msg: unknown, ev: { off: () => void }) => {
      events.push(ev);
      if (data === null || data === undefined || !data.name) {
        dataRef.current.delete(key);
      } else {
        dataRef.current.set(key, cleanHabitData(data));
      }

      const arr = Array.from(dataRef.current.values())
        .filter((h) => !h.isArchived)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setHabits(arr);
    };

    node.on(handler as never);

    return () => {
      events.forEach((ev) => ev.off());
    };
  }, []);

  return { habits };
}

export function useHabit(id: string | undefined) {
  const [habit, setHabit] = useState<Habit | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setHabit(undefined);
      return;
    }

    const node = user.get('habits' as never).get(id as never);
    let ev: { off: () => void } | null = null;

    const handler = (data: (Habit & { _?: unknown }) | null, _key: string, _msg: unknown, event: { off: () => void }) => {
      ev = event;
      if (data === null || data === undefined || !data.name) {
        setHabit(undefined);
      } else {
        setHabit(cleanHabitData(data));
      }
    };

    node.on(handler as never);

    return () => {
      ev?.off();
    };
  }, [id]);

  return habit;
}

/**
 * Subscribe to Gun entry nodes for each habit on a given date.
 * Accepts habits array to avoid creating a redundant useHabits() subscription.
 */
export function useEntriesForDate(date: Date, habits: Habit[]) {
  const dateStr = toDateString(date);
  const habitIds = useMemo(() => habits.map((h) => h.id), [habits]);

  return useEntriesForHabitIds(habitIds, dateStr);
}

/**
 * Shared subscription logic: subscribe to entry nodes for a list of habitIds on a date.
 * Returns entries array with { habitId, date, completed, value? }.
 */
function useEntriesForHabitIds(habitIds: string[], dateStr: string) {
  const [entries, setEntries] = useState<
    { habitId: string; date: string; completed: boolean; value?: number }[]
  >([]);
  const dataRef = useRef<Map<string, { habitId: string; date: string; completed: boolean; value?: number }>>(new Map());

  useEffect(() => {
    dataRef.current = new Map();
    setEntries([]);

    if (habitIds.length === 0 || !dateStr) return;

    const events: Array<{ off: () => void }> = [];

    for (const habitId of habitIds) {
      const node = user
        .get('habits' as never)
        .get(habitId as never)
        .get('entries' as never)
        .get(dateStr as never);

      const handler = (data: Record<string, unknown> | null, _key: string, _msg: unknown, ev: { off: () => void }) => {
        events.push(ev);
        if (data === null || data === undefined || data.completed === undefined) {
          dataRef.current.delete(habitId);
        } else {
          dataRef.current.set(habitId, {
            habitId,
            date: dateStr,
            completed: data.completed as boolean,
            value: data.value as number | undefined,
          });
        }
        setEntries(Array.from(dataRef.current.values()));
      };

      node.on(handler as never);
    }

    return () => {
      events.forEach((ev) => ev.off());
    };
  }, [habitIds.join(','), dateStr]);

  return entries;
}

export function useAllEntries(habitId: string) {
  const [entries, setEntries] = useState<
    { habitId: string; date: string; completed: boolean; value?: number }[]
  >([]);
  const dataRef = useRef<
    Map<string, { habitId: string; date: string; completed: boolean; value?: number }>
  >(new Map());

  const buildArray = useCallback(() => {
    const arr = Array.from(dataRef.current.values());
    arr.sort((a, b) => a.date.localeCompare(b.date));
    setEntries(arr);
  }, []);

  useEffect(() => {
    dataRef.current = new Map();
    setEntries([]);

    if (!habitId) return;

    const node = user
      .get('habits' as never)
      .get(habitId as never)
      .get('entries' as never)
      .map();

    const events: Array<{ off: () => void }> = [];

    const handler = (data: Record<string, unknown> | null, key: string, _msg: unknown, ev: { off: () => void }) => {
      events.push(ev);
      if (data === null || data === undefined || data.completed === undefined) {
        dataRef.current.delete(key);
      } else {
        dataRef.current.set(key, {
          habitId,
          date: key,
          completed: data.completed as boolean,
          value: data.value as number | undefined,
        });
      }
      buildArray();
    };

    node.on(handler as never);

    return () => {
      events.forEach((ev) => ev.off());
    };
  }, [habitId, buildArray]);

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
  const id = generateId();

  const habit = gunSafe({
    id,
    name: data.name.trim(),
    type: data.type,
    unit: data.type === 'numeric' ? (data.unit?.trim() || null) : null,
    createdAt: toDateString(new Date()),
    reminderEnabled: data.reminderEnabled,
    reminderHour: data.reminderHour,
    reminderMinute: data.reminderMinute,
    sortOrder: Date.now(),
    isArchived: false,
  });

  user.get('habits' as never).get(id as never).put(habit as never, ((ack: { err?: string }) => {
    if (ack.err) {
      console.error('Gun put error (createHabit):', ack.err);
    }
  }) as never);

  if (data.reminderEnabled) {
    scheduleReminder(id, data.name, data.reminderHour, data.reminderMinute);
  }

  syncAllRemindersToServer();
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
  user.get('habits' as never).get(id as never).put(gunSafe({
    name: data.name.trim(),
    unit: data.unit?.trim() || null,
    reminderEnabled: data.reminderEnabled,
    reminderHour: data.reminderHour,
    reminderMinute: data.reminderMinute,
  }) as never, ((ack: { err?: string }) => {
    if (ack.err) {
      console.error('Gun put error (updateHabit):', ack.err);
    }
  }) as never);

  if (data.reminderEnabled) {
    scheduleReminder(id, data.name, data.reminderHour, data.reminderMinute);
  } else {
    cancelReminder(id);
  }

  syncAllRemindersToServer();
}

export async function deleteHabit(id: string): Promise<void> {
  cancelReminder(id);
  // Nullify the habit node — Gun doesn't truly delete, but null signals removal
  user.get('habits' as never).get(id as never).put(null as never, ((ack: { err?: string }) => {
    if (ack.err) {
      console.error('Gun put error (deleteHabit):', ack.err);
    }
  }) as never);

  syncAllRemindersToServer();
}

export async function toggleBinary(habitId: string, date: Date): Promise<void> {
  const dateStr = toDateString(date);
  const entryNode = user
    .get('habits' as never)
    .get(habitId as never)
    .get('entries' as never)
    .get(dateStr as never);

  // Read current state
  const current = await new Promise<{ completed?: boolean }>((resolve) => {
    entryNode.once(((data: Record<string, unknown> | null) => {
      resolve(data ? { completed: data.completed as boolean } : {});
    }) as never);
  });

  const newCompleted = !(current.completed ?? false);
  entryNode.put({ completed: newCompleted } as never, ((ack: { err?: string }) => {
    if (ack.err) console.error('Gun put error (toggleBinary):', ack.err);
  }) as never);
}

export async function setNumericValue(
  habitId: string,
  value: number,
  date: Date,
): Promise<void> {
  const dateStr = toDateString(date);
  user
    .get('habits' as never)
    .get(habitId as never)
    .get('entries' as never)
    .get(dateStr as never)
    .put({ completed: true, value } as never, ((ack: { err?: string }) => {
      if (ack.err) console.error('Gun put error (setNumericValue):', ack.err);
    }) as never);
}

export async function clearNumericValue(habitId: string, date: Date): Promise<void> {
  const dateStr = toDateString(date);
  user
    .get('habits' as never)
    .get(habitId as never)
    .get('entries' as never)
    .get(dateStr as never)
    .put({ completed: false, value: null } as never, ((ack: { err?: string }) => {
      if (ack.err) console.error('Gun put error (clearNumericValue):', ack.err);
    }) as never);
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
