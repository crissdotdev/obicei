import webpush from 'web-push';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const VAPID_PATH = join(DATA_DIR, 'vapid.json');

export function getVapidKeys() {
  // Prefer environment variables (required for platforms with ephemeral storage)
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }

  // Fallback: file-based for local development
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  if (existsSync(VAPID_PATH)) {
    return JSON.parse(readFileSync(VAPID_PATH, 'utf-8'));
  }

  const keys = webpush.generateVAPIDKeys();
  writeFileSync(VAPID_PATH, JSON.stringify(keys, null, 2));
  console.log('Generated new VAPID keys. For production, set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.');
  return keys;
}
