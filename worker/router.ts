import type { Env } from './env';
import { authenticate, json, unauthorized } from './middleware';
import { handleSignup, handleLogin, handleLogout } from './routes/auth';
import { handleHabits } from './routes/habits';
import { handlePush } from './routes/push';

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  try {
    return await routeRequest(request, env);
  } catch (err) {
    console.error('Unhandled error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}

async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Auth routes (no auth required)
  if (path === '/api/auth/signup' && method === 'POST') return handleSignup(request, env);
  if (path === '/api/auth/login' && method === 'POST') return handleLogin(request, env);
  if (path === '/api/auth/logout' && method === 'POST') return handleLogout(request, env);

  // VAPID public key (no auth required)
  if (path === '/api/push/vapid-public-key' && method === 'GET') {
    return json({ publicKey: env.VAPID_PUBLIC_KEY });
  }

  // Authenticated routes
  const user = await authenticate(request, env);
  if (!user) return unauthorized();

  // Habits routes
  if (path.startsWith('/api/habits')) return handleHabits(request, env, user, path, method);

  // Push routes
  if (path.startsWith('/api/push/')) return handlePush(request, env, user, path, method);

  return json({ error: 'Not found' }, 404);
}
