import type { Env } from './env';

export interface AuthUser {
  userId: number;
  username: string;
}

export async function authenticate(request: Request, env: Env): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `SELECT s.user_id, u.username FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
  )
    .bind(token, now)
    .first<{ user_id: number; username: string }>();

  if (!row) return null;
  return { userId: row.user_id, username: row.username };
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function unauthorized(): Response {
  return json({ error: 'Unauthorized' }, 401);
}

export async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json<T>();
  } catch {
    return null;
  }
}
