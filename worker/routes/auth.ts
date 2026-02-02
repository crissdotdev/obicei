import type { Env } from '../env';
import { hashPassword, verifyPassword, generateSessionToken } from '../auth';
import { json, parseJsonBody } from '../middleware';
import { getClientIp, isRateLimited } from '../rate-limit';

const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const MIN_SUBMIT_TIME_MS = 2000;
const MAX_PASSWORD_LENGTH = 128;

interface AuthBody {
  username?: string;
  password?: string;
  website?: string; // honeypot
  _t?: number; // form render timestamp
}

type ValidatedAuth =
  | { ok: true; username: string; password: string }
  | { ok: false; response: Response };

async function validateAuthRequest(
  request: Request,
  endpoint: 'signup' | 'login',
  env: Env,
): Promise<ValidatedAuth> {
  const ip = getClientIp(request);
  if (!ip) {
    return { ok: false, response: json({ error: 'Unable to verify request origin' }, 400) };
  }

  if (await isRateLimited(ip, endpoint, env)) {
    return { ok: false, response: json({ error: 'Too many attempts. Please try again later.' }, 429) };
  }

  const body = await parseJsonBody<AuthBody>(request);
  if (!body) {
    return { ok: false, response: json({ error: 'Invalid JSON body' }, 400) };
  }

  // Honeypot — bots auto-fill hidden fields
  if (body.website) {
    return { ok: false, response: json({ error: 'Request failed' }, 400) };
  }

  // Timing guard — humans need more than 2s to fill a form
  if (body._t && Date.now() - body._t < MIN_SUBMIT_TIME_MS) {
    return { ok: false, response: json({ error: 'Request failed' }, 400) };
  }

  const username = body.username?.trim();
  const password = body.password;

  if (!username || !password) {
    return { ok: false, response: json({ error: 'Username and password required' }, 400) };
  }

  if (password.length < 8 || password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, response: json({ error: 'Password must be 8-128 characters' }, 400) };
  }

  return { ok: true, username, password };
}

async function createSession(userId: number, username: string, env: Env): Promise<Response> {
  const token = generateSessionToken();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)')
    .bind(userId, token, now + SESSION_DURATION)
    .run();

  return json({ token, username });
}

export async function handleSignup(request: Request, env: Env): Promise<Response> {
  const validated = await validateAuthRequest(request, 'signup', env);
  if (!validated.ok) return validated.response;

  const { username, password } = validated;

  if (!USERNAME_REGEX.test(username)) {
    return json({ error: 'Username must be 3-30 characters: letters, numbers, hyphens, underscores' }, 400);
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

  return createSession(result.meta.last_row_id as number, username, env);
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const validated = await validateAuthRequest(request, 'login', env);
  if (!validated.ok) return validated.response;

  const { username, password } = validated;

  const user = await env.DB.prepare('SELECT id, password_hash FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number; password_hash: string }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: 'Invalid username or password' }, 401);
  }

  return createSession(user.id, username, env);
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  return json({ ok: true });
}
