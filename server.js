import express from 'express';
import { createServer } from 'http';
import Gun from 'gun';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getVapidKeys } from './server/vapid.js';
import { saveSubscription, removeSubscription } from './server/push-store.js';
import { startScheduler } from './server/push-scheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 8765;

const vapidKeys = getVapidKeys();

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// ─── Push API ────────────────────────────────────────────────

app.get('/api/push/vapid-public-key', (_req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/push/subscribe', (req, res) => {
  const { pub, subscription, reminders } = req.body;
  if (!pub || !subscription) {
    return res.status(400).json({ error: 'pub and subscription required' });
  }
  const list = reminders || [];
  for (const r of list) {
    if (typeof r.hour !== 'number' || r.hour < 0 || r.hour > 23 ||
        typeof r.minute !== 'number' || r.minute < 0 || r.minute > 59) {
      return res.status(400).json({ error: 'invalid reminder time' });
    }
  }
  saveSubscription(pub, subscription, list);
  res.json({ ok: true });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const { pub } = req.body;
  if (!pub) {
    return res.status(400).json({ error: 'pub required' });
  }
  removeSubscription(pub);
  res.json({ ok: true });
});

// ─── SPA fallback ────────────────────────────────────────────

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const server = createServer(app);

// Attach Gun relay to the HTTP server
Gun({ web: server });

server.listen(port, () => {
  console.log(`Obicei running on port ${port}`);
  startScheduler(vapidKeys);
});
