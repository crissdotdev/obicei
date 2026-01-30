export interface Habit {
  id: string;
  name: string;
  type: 'binary' | 'numeric';
  unit?: string;
  createdAt: string;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  sortOrder: number;
  isArchived: boolean;
}
