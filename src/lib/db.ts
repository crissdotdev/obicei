import Dexie, { type Table } from 'dexie';
import type { Habit } from '../models/habit';
import type { HabitEntry } from '../models/habit-entry';

export class ObiceiDB extends Dexie {
  habits!: Table<Habit>;
  entries!: Table<HabitEntry>;

  constructor() {
    super('obicei-db');
    this.version(1).stores({
      habits: 'id, sortOrder, isArchived',
      entries: 'id, habitId, date, [habitId+date]',
    });
  }
}

export const db = new ObiceiDB();
