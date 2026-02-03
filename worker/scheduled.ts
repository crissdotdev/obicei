import type { Env } from './env';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { cleanupOldAttempts } from './rate-limit';

async function sendPush(
  env: Env,
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
): Promise<void> {
  const subscription = {
    endpoint,
    expirationTime: null,
    keys: { p256dh, auth },
  };

  try {
    const pushPayload = await buildPushPayload(
      {
        data: payload,
        options: { urgency: 'normal', ttl: 3600 },
      },
      subscription,
      {
        subject: env.VAPID_SUBJECT,
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
      },
    );

    const response = await fetch(endpoint, pushPayload);

    if (response.status === 410 || response.status === 404) {
      await env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
        .bind(endpoint)
        .run();
    }
  } catch (err) {
    console.error(`Push failed for ${endpoint}:`, err);
  }
}

export async function handleScheduled(env: Env): Promise<void> {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();

  // Per-habit reminders
  const habitRows = await env.DB.prepare(
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

  for (const row of habitRows.results) {
    const payload = JSON.stringify({
      title: 'obicei',
      body: `Time to track: ${row.habit_name}`,
      tag: `habit-${row.habit_id}`,
    });
    await sendPush(env, row.endpoint as string, row.p256dh as string, row.auth as string, payload);
  }

  // Global reminders
  const globalRows = await env.DB.prepare(
    `SELECT ps.endpoint, ps.p256dh, ps.auth
     FROM user_settings us
     JOIN push_subscriptions ps ON ps.user_id = us.user_id
     WHERE us.global_reminder_enabled = 1
       AND us.global_reminder_hour = ?
       AND us.global_reminder_minute = ?`,
  )
    .bind(utcHour, utcMinute)
    .all();

  for (const row of globalRows.results) {
    const payload = JSON.stringify({
      title: 'obicei',
      body: 'Time to track your habits',
      tag: 'global-reminder',
    });
    await sendPush(env, row.endpoint as string, row.p256dh as string, row.auth as string, payload);
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
