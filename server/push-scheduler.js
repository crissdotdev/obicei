import webpush from 'web-push';
import { getAll, removeSubscription } from './push-store.js';

const firedToday = new Map();
let lastDateStr = '';

function clearFiredIfNewDay() {
  const today = new Date().toISOString().split('T')[0];
  if (today !== lastDateStr) {
    firedToday.clear();
    lastDateStr = today;
  }
}

async function tick() {
  clearFiredIfNewDay();

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const today = now.toISOString().split('T')[0];

  const allSubs = getAll();

  for (const [pub, entry] of Object.entries(allSubs)) {
    const { subscription, reminders } = entry;
    if (!reminders || !subscription) continue;

    for (const reminder of reminders) {
      if (reminder.hour !== currentHour || reminder.minute !== currentMinute) continue;

      const dedupeKey = `${pub}:${reminder.habitId}:${today}`;
      if (firedToday.has(dedupeKey)) continue;

      const payload = JSON.stringify({
        title: 'obicei',
        body: `Time to track: ${reminder.habitName}`,
        tag: `habit-${reminder.habitId}`,
      });

      try {
        await webpush.sendNotification(subscription, payload);
        firedToday.set(dedupeKey, true);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Subscription expired for ${pub}, removing.`);
          removeSubscription(pub);
          break;
        }
        console.error(`Push failed for ${pub}:`, err.message);
      }
    }
  }
}

export function startScheduler(vapidKeys) {
  webpush.setVapidDetails(
    'mailto:noreply@obicei.app',
    vapidKeys.publicKey,
    vapidKeys.privateKey,
  );

  // Run immediately, then every 60s
  tick();
  setInterval(tick, 60_000);
  console.log('Push scheduler started.');
}
