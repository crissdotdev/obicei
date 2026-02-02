import type { Env } from '../env';
import type { AuthUser } from '../middleware';
import { json, parseJsonBody } from '../middleware';

function isValidTime(hour: unknown, minute: unknown): boolean {
  return (
    typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 23 &&
    typeof minute === 'number' && Number.isInteger(minute) && minute >= 0 && minute <= 59
  );
}

export async function handleHabits(
  request: Request,
  env: Env,
  user: AuthUser,
  path: string,
  method: string,
): Promise<Response> {
  // GET /api/habits
  if (path === '/api/habits' && method === 'GET') {
    const rows = await env.DB.prepare(
      `SELECT id, name, type, unit, created_at, reminder_enabled, reminder_hour,
              reminder_minute, sort_order, is_archived
       FROM habits WHERE user_id = ? AND is_archived = 0
       ORDER BY sort_order ASC`,
    )
      .bind(user.userId)
      .all();

    const habits = rows.results.map(toHabitJson);
    return json(habits);
  }

  // POST /api/habits
  if (path === '/api/habits' && method === 'POST') {
    const body = await parseJsonBody<{
      id?: string;
      name?: string;
      type?: string;
      unit?: string;
      createdAt?: string;
      reminderEnabled?: boolean;
      reminderHour?: number;
      reminderMinute?: number;
      sortOrder?: number;
    }>(request);
    if (!body) return json({ error: 'Invalid JSON body' }, 400);

    if (!body.name?.trim() || !body.type) {
      return json({ error: 'name and type required' }, 400);
    }

    if (body.reminderEnabled && !isValidTime(body.reminderHour, body.reminderMinute)) {
      return json({ error: 'reminderHour must be 0-23 and reminderMinute must be 0-59' }, 400);
    }

    const id = body.id || crypto.randomUUID().replace(/-/g, '');

    await env.DB.prepare(
      `INSERT INTO habits (id, user_id, name, type, unit, created_at, reminder_enabled,
                           reminder_hour, reminder_minute, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        user.userId,
        body.name.trim(),
        body.type,
        body.unit?.trim() || null,
        body.createdAt || new Date().toISOString().split('T')[0],
        body.reminderEnabled ? 1 : 0,
        body.reminderHour ?? 9,
        body.reminderMinute ?? 0,
        body.sortOrder ?? Date.now(),
      )
      .run();

    return json({ id }, 201);
  }

  // GET /api/habits/entries/by-date/:date — batch entries for all habits on a date
  const byDateMatch = path.match(/^\/api\/habits\/entries\/by-date\/(\d{4}-\d{2}-\d{2})$/);
  if (byDateMatch && method === 'GET') {
    const [, date] = byDateMatch;
    const rows = await env.DB.prepare(
      `SELECT e.habit_id, e.date, e.completed, e.value
       FROM entries e
       JOIN habits h ON h.id = e.habit_id
       WHERE h.user_id = ? AND e.date = ?`,
    )
      .bind(user.userId, date)
      .all();

    const entries = rows.results.map((r) => ({
      habitId: r.habit_id as string,
      date: r.date as string,
      completed: !!(r.completed as number),
      value: r.value as number | null,
    }));
    return json(entries);
  }

  // Match /api/habits/:id/entries/:date
  const entryMatch = path.match(/^\/api\/habits\/([^/]+)\/entries\/(\d{4}-\d{2}-\d{2})$/);
  if (entryMatch && method === 'PUT') {
    const [, habitId, date] = entryMatch;
    return handleUpsertEntry(env, user, habitId, date, request);
  }

  // Match /api/habits/:id/entries
  const entriesMatch = path.match(/^\/api\/habits\/([^/]+)\/entries$/);
  if (entriesMatch && method === 'GET') {
    const [, habitId] = entriesMatch;
    return handleGetEntries(env, user, habitId);
  }

  // Match /api/habits/:id
  const habitMatch = path.match(/^\/api\/habits\/([^/]+)$/);
  if (habitMatch) {
    const [, habitId] = habitMatch;

    if (method === 'PUT') {
      return handleUpdateHabit(env, user, habitId, request);
    }
    if (method === 'DELETE') {
      return handleDeleteHabit(env, user, habitId);
    }
  }

  return json({ error: 'Not found' }, 404);
}

async function handleUpdateHabit(
  env: Env,
  user: AuthUser,
  habitId: string,
  request: Request,
): Promise<Response> {
  const body = await parseJsonBody<{
    name?: string;
    unit?: string;
    reminderEnabled?: boolean;
    reminderHour?: number;
    reminderMinute?: number;
    sortOrder?: number;
    isArchived?: boolean;
  }>(request);
  if (!body) return json({ error: 'Invalid JSON body' }, 400);

  const sets: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    sets.push('name = ?');
    values.push(body.name.trim());
  }
  if (body.unit !== undefined) {
    sets.push('unit = ?');
    values.push(body.unit?.trim() || null);
  }
  if (body.reminderEnabled !== undefined) {
    sets.push('reminder_enabled = ?');
    values.push(body.reminderEnabled ? 1 : 0);
  }
  if (body.reminderHour !== undefined) {
    if (typeof body.reminderHour !== 'number' || body.reminderHour < 0 || body.reminderHour > 23) {
      return json({ error: 'reminderHour must be 0-23' }, 400);
    }
    sets.push('reminder_hour = ?');
    values.push(body.reminderHour);
  }
  if (body.reminderMinute !== undefined) {
    if (typeof body.reminderMinute !== 'number' || body.reminderMinute < 0 || body.reminderMinute > 59) {
      return json({ error: 'reminderMinute must be 0-59' }, 400);
    }
    sets.push('reminder_minute = ?');
    values.push(body.reminderMinute);
  }
  if (body.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    values.push(body.sortOrder);
  }
  if (body.isArchived !== undefined) {
    sets.push('is_archived = ?');
    values.push(body.isArchived ? 1 : 0);
  }

  if (sets.length === 0) {
    return json({ error: 'No fields to update' }, 400);
  }

  values.push(habitId, user.userId);
  await env.DB.prepare(`UPDATE habits SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`)
    .bind(...values)
    .run();

  return json({ ok: true });
}

async function handleDeleteHabit(env: Env, user: AuthUser, habitId: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, user.userId)
    .run();
  return json({ ok: true });
}

async function handleUpsertEntry(
  env: Env,
  user: AuthUser,
  habitId: string,
  date: string,
  request: Request,
): Promise<Response> {
  // Verify habit belongs to user
  const habit = await env.DB.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, user.userId)
    .first();
  if (!habit) return json({ error: 'Habit not found' }, 404);

  const body = await parseJsonBody<{ completed?: boolean; value?: number | null }>(request);
  if (!body) return json({ error: 'Invalid JSON body' }, 400);

  await env.DB.prepare(
    `INSERT INTO entries (habit_id, date, completed, value)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(habit_id, date)
     DO UPDATE SET completed = excluded.completed, value = excluded.value`,
  )
    .bind(habitId, date, body.completed ? 1 : 0, body.value ?? null)
    .run();

  return json({ ok: true });
}

async function handleGetEntries(env: Env, user: AuthUser, habitId: string): Promise<Response> {
  // Verify habit belongs to user
  const habit = await env.DB.prepare('SELECT id FROM habits WHERE id = ? AND user_id = ?')
    .bind(habitId, user.userId)
    .first();
  if (!habit) return json({ error: 'Habit not found' }, 404);

  const rows = await env.DB.prepare(
    'SELECT habit_id, date, completed, value FROM entries WHERE habit_id = ? ORDER BY date ASC',
  )
    .bind(habitId)
    .all();

  const entries = rows.results.map((r) => ({
    habitId: r.habit_id as string,
    date: r.date as string,
    completed: !!(r.completed as number),
    value: r.value as number | null,
  }));

  return json(entries);
}

function toHabitJson(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    unit: row.unit || undefined,
    createdAt: row.created_at,
    reminderEnabled: !!(row.reminder_enabled as number),
    reminderHour: row.reminder_hour,
    reminderMinute: row.reminder_minute,
    sortOrder: row.sort_order,
    isArchived: !!(row.is_archived as number),
  };
}
