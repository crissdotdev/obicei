import type { Env } from './env';

const WINDOW_SECONDS = 3600; // 1 hour
const SIGNUP_LIMIT = 5;
const LOGIN_LIMIT = 10;

const LIMITS: Record<string, number> = {
  signup: SIGNUP_LIMIT,
  login: LOGIN_LIMIT,
};

export function getClientIp(request: Request): string | null {
  return (
    request.headers.get('CF-Connecting-IP') ??
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    null
  );
}

export async function isRateLimited(ip: string, endpoint: string, env: Env): Promise<boolean> {
  const limit = LIMITS[endpoint];
  if (!limit) return false;

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - WINDOW_SECONDS;

  // Check count FIRST — don't record if already limited
  const row = await env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM auth_attempts WHERE ip = ? AND endpoint = ? AND attempted_at >= ?',
  )
    .bind(ip, endpoint, windowStart)
    .first<{ cnt: number }>();

  const count = row?.cnt ?? 0;

  if (count >= limit) return true;

  // Only record if not already limited
  await env.DB.prepare('INSERT INTO auth_attempts (ip, endpoint, attempted_at) VALUES (?, ?, ?)')
    .bind(ip, endpoint, now)
    .run();

  return false;
}

export async function cleanupOldAttempts(env: Env): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - WINDOW_SECONDS;
  await env.DB.prepare('DELETE FROM auth_attempts WHERE attempted_at < ?').bind(cutoff).run();
}
