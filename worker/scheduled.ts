import type { Env } from './env';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { cleanupOldAttempts } from './rate-limit';

export async function handleScheduled(env: Env): Promise<void> {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  // Find habits with reminders at this time, joined with their user's push subscriptions
  const rows = await env.DB.prepare(
    `SELECT h.name AS habit_name, h.id AS habit_id,
            ps.endpoint, ps.p256dh, ps.auth
     FROM habits h
     JOIN push_subscriptions ps ON ps.user_id = h.user_id
     WHERE h.reminder_enabled = 1
       AND h.reminder_hour = ?
       AND h.reminder_minute = ?
       AND h.is_archived = 0`,
  )
    .bind(utcHour, utcMinute)
    .all();

  for (const row of rows.results) {
    const payload = JSON.stringify({
      title: 'obicei',
      body: `Time to track: ${row.habit_name}`,
      tag: `habit-${row.habit_id}`,
    });

    const subscription = {
      endpoint: row.endpoint as string,
      expirationTime: null,
      keys: {
        p256dh: row.p256dh as string,
        auth: row.auth as string,
      },
    };

    try {
      const pushPayload = await buildPushPayload(
        {
          data: payload,
          options: {
            urgency: 'normal',
            ttl: 3600,
          },
        },
        subscription,
        {
          subject: env.VAPID_SUBJECT,
          publicKey: env.VAPID_PUBLIC_KEY,
          privateKey: env.VAPID_PRIVATE_KEY,
        },
      );

      const response = await fetch(subscription.endpoint, pushPayload);

      // Remove stale subscriptions
      if (response.status === 410 || response.status === 404) {
        await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
          .bind(subscription.endpoint)
          .run();
      }
    } catch (err) {
      console.error(`Push failed for ${subscription.endpoint}:`, err);
    }
  }

  // Clean expired sessions
  try {
    const nowUnix = Math.floor(Date.now() / 1000);
    await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(nowUnix).run();
  } catch (err) {
    console.error('Failed to clean expired sessions:', err);
  }

  // Clean old rate-limit entries
  try {
    await cleanupOldAttempts(env);
  } catch (err) {
    console.error('Failed to clean old auth attempts:', err);
  }
}
