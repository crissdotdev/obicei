import type { Env } from '../env';
import type { AuthUser } from '../middleware';
import { json, parseJsonBody } from '../middleware';

export async function handlePush(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
  method: string,
): Promise<Response> {
  if (path === '/api/push/subscribe' && method === 'POST') {
    const body = await parseJsonBody<{
      subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      reminders?: { habitId: string; habitName: string; hour: number; minute: number }[];
    }>(request);
    if (!body) return json({ error: 'Invalid JSON body' }, 400);

    const sub = body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return json({ error: 'Valid subscription required' }, 400);
    }

    // Upsert push subscription
    await env.DB.prepare(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, user_id = excluded.user_id`,
    )
      .bind(user.userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth)
      .run();

    // Update habit reminder settings if provided
    if (body.reminders) {
      for (const r of body.reminders) {
        if (typeof r.hour === 'number' && r.hour >= 0 && r.hour <= 23 &&
            typeof r.minute === 'number' && r.minute >= 0 && r.minute <= 59) {
          await env.DB.prepare(
            `UPDATE habits SET reminder_enabled = 1, reminder_hour = ?, reminder_minute = ?
             WHERE id = ? AND user_id = ?`,
          )
            .bind(r.hour, r.minute, r.habitId, user.userId)
            .run();
        }
      }
    }

    return json({ ok: true });
  }

  if (path === '/api/push/unsubscribe' && method === 'POST') {
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?')
      .bind(user.userId)
      .run();
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}
