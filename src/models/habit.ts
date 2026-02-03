export interface Habit {
  id: string;
  name: string;
  type: 'binary' | 'numeric';
  unit?: string;
  createdAt: string;
  reminderEnabled: boolean;
  /** Hour in UTC (0-23). Convert with utcToLocal() before displaying to user. */
  reminderHour: number;
  /** Minute in UTC (0-59). Convert with utcToLocal() before displaying to user. */
  reminderMinute: number;
  sortOrder: number;
  isArchived: boolean;
  category: string | null;
  categoryOrder: number;
}
