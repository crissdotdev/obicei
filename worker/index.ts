import type { Env } from './env';
import { handleRequest } from './router';
import { handleScheduled } from './scheduled';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleRequest(request, env);
    }
    // Non-API requests are handled by the assets binding (configured in wrangler.toml)
    return env.ASSETS.fetch(request);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
};
