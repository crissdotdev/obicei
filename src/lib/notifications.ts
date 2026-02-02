import { syncRemindersToServer, unsubscribeFromPush } from './push';

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
      return { habitId, habitName, hour, minute };
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

// In-app reminder check (runs when tab is open)
let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderChecker(): void {
  if (reminderInterval) return;

  reminderInterval = setInterval(() => {
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const reminders = JSON.parse(localStorage.getItem('obicei-reminders') || '{}');
    const lastFired = JSON.parse(localStorage.getItem('obicei-reminders-fired') || '{}');
    const today = now.toISOString().split('T')[0];

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
  }, 60000);
}
