import { api, getToken } from './api';
import { syncRemindersToServer, unsubscribeFromPush } from './push';
import { localToUtc, utcToLocal } from './timezone';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function scheduleReminder(habitId: string, habitName: string, hour: number, minute: number): void {
  const reminders = JSON.parse(localStorage.getItem('obicei-reminders') || '{}');
  reminders[habitId] = { habitName, hour, minute };
  localStorage.setItem('obicei-reminders', JSON.stringify(reminders));
}

export function cancelReminder(habitId: string): void {
  const reminders = JSON.parse(localStorage.getItem('obicei-reminders') || '{}');
  delete reminders[habitId];
  localStorage.setItem('obicei-reminders', JSON.stringify(reminders));
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function syncAllRemindersToServer(): void {
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(() => {
    const reminders = JSON.parse(localStorage.getItem('obicei-reminders') || '{}');
    const reminderList = Object.entries(reminders).map(([habitId, config]) => {
      const { habitName, hour, minute } = config as { habitName: string; hour: number; minute: number };
      const utc = localToUtc(hour, minute);
      return { habitId, habitName, hour: utc.hour, minute: utc.minute };
    });

    if (reminderList.length === 0) {
      unsubscribeFromPush().catch(() => {});
      return;
    }

    syncRemindersToServer(reminderList).catch((err) =>
      console.error('Failed to sync reminders to server:', err),
    );
  }, 500);
}

// Global reminder localStorage helpers (times stored in LOCAL timezone)
const GLOBAL_REMINDER_KEY = 'obicei-global-reminder';

export function getGlobalReminder(): { enabled: boolean; hour: number; minute: number } | null {
  const raw = localStorage.getItem(GLOBAL_REMINDER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setGlobalReminder(enabled: boolean, hour: number, minute: number): void {
  localStorage.setItem(GLOBAL_REMINDER_KEY, JSON.stringify({ enabled, hour, minute }));
}

/**
 * Re-sync global reminder to server with current UTC offset (handles DST drift).
 * Called on app load.
 */
export async function syncGlobalReminderToServer(): Promise<void> {
  if (!getToken()) return;
  const saved = getGlobalReminder();
  if (!saved || !saved.enabled) return;

  const utc = localToUtc(saved.hour, saved.minute);
  await api.put('/settings', {
    globalReminderEnabled: true,
    globalReminderHour: utc.hour,
    globalReminderMinute: utc.minute,
  }).catch((err) => console.error('Failed to sync global reminder:', err));
}

// In-app reminder check (runs when tab is open)
// All times in localStorage are in LOCAL timezone.
let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderChecker(): void {
  if (reminderInterval) return;

  reminderInterval = setInterval(() => {
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const reminders = JSON.parse(localStorage.getItem('obicei-reminders') || '{}');
    const lastFired = JSON.parse(localStorage.getItem('obicei-reminders-fired') || '{}');
    const today = now.toISOString().split('T')[0];

    // Per-habit reminders
    for (const [habitId, config] of Object.entries(reminders)) {
      const { habitName, hour, minute } = config as { habitName: string; hour: number; minute: number };
      const firedKey = `${habitId}-${today}`;

      if (now.getHours() === hour && now.getMinutes() === minute && !lastFired[firedKey]) {
        new Notification('obicei', {
          body: `Time to track: ${habitName}`,
          tag: `habit-${habitId}`,
        });
        lastFired[firedKey] = true;
        localStorage.setItem('obicei-reminders-fired', JSON.stringify(lastFired));
      }
    }

    // Global reminder
    const global = getGlobalReminder();
    if (global?.enabled) {
      const firedKey = `global-${today}`;
      if (now.getHours() === global.hour && now.getMinutes() === global.minute && !lastFired[firedKey]) {
        new Notification('obicei', {
          body: 'Time to track your habits',
          tag: 'global-reminder',
        });
        lastFired[firedKey] = true;
        localStorage.setItem('obicei-reminders-fired', JSON.stringify(lastFired));
      }
    }
  }, 60000);
}
