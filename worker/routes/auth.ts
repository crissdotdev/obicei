import type { Env } from '../env';
import { hashPassword, verifyPassword, generateSessionToken } from '../auth';
import { json, parseJsonBody } from '../middleware';

const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export async function handleSignup(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody<{ username?: string; password?: string }>(request);
  if (!body) return json({ error: 'Invalid JSON body' }, 400);

  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password || password.length < 8) {
    return json({ error: 'Username required and password must be at least 8 characters' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
    .bind(username)
    .first();
  if (existing) {
    return json({ error: 'Username already exists' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .bind(username, passwordHash)
    .run();

  const userId = result.meta.last_row_id;
  const token = generateSessionToken();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
    .bind(userId, token, now + SESSION_DURATION)
    .run();

  return json({ token, username });
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody<{ username?: string; password?: string }>(request);
  if (!body) return json({ error: 'Invalid JSON body' }, 400);

  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password) {
    return json({ error: 'Username and password required' }, 400);
  }

  const user = await env.DB.prepare('SELECT id, password_hash FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number; password_hash: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: 'Invalid username or password' }, 401);
  }

  const token = generateSessionToken();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
    .bind(user.id, token, now + SESSION_DURATION)
    .run();

  return json({ token, username });
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  return json({ ok: true });
}
