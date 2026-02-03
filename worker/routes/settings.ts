import type { Env } from '../env';
import type { AuthUser } from '../middleware';
import { json, parseJsonBody } from '../middleware';

function isValidTime(hour: unknown, minute: unknown): boolean {
  return (
    typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 23 &&
    typeof minute === 'number' && Number.isInteger(minute) && minute >= 0 && minute <= 59
  );
}

export async function handleSettings(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
  method: string,
): Promise<Response> {
  if (path === '/api/settings' && method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT global_reminder_enabled, global_reminder_hour, global_reminder_minute FROM user_settings WHERE user_id = ?',
    )
      .bind(user.userId)
      .first();

    if (!row) {
      return json({
        globalReminderEnabled: false,
        globalReminderHour: 20,
        globalReminderMinute: 0,
      });
    }

    return json({
      globalReminderEnabled: !!row.global_reminder_enabled,
      globalReminderHour: row.global_reminder_hour,
      globalReminderMinute: row.global_reminder_minute,
    });
  }

  if (path === '/api/settings' && method === 'PUT') {
    const body = await parseJsonBody<{
      globalReminderEnabled?: boolean;
      globalReminderHour?: number;
      globalReminderMinute?: number;
    }>(request);
    if (!body) return json({ error: 'Invalid JSON body' }, 400);

    const enabled = body.globalReminderEnabled ? 1 : 0;
    const hour = isValidTime(body.globalReminderHour, body.globalReminderMinute)
      ? body.globalReminderHour! : 20;
    const minute = isValidTime(body.globalReminderHour, body.globalReminderMinute)
      ? body.globalReminderMinute! : 0;

    await env.DB.prepare(
      `INSERT INTO user_settings (user_id, global_reminder_enabled, global_reminder_hour, global_reminder_minute)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         global_reminder_enabled = excluded.global_reminder_enabled,
         global_reminder_hour = excluded.global_reminder_hour,
         global_reminder_minute = excluded.global_reminder_minute`,
    )
      .bind(user.userId, enabled, hour, minute)
      .run();

    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}
