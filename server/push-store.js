import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const STORE_PATH = join(DATA_DIR, 'push-subscriptions.json');

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadSubscriptions() {
  ensureDir();
  if (!existsSync(STORE_PATH)) return {};
  return JSON.parse(readFileSync(STORE_PATH, 'utf-8'));
}

function persist(data) {
  ensureDir();
  writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export function saveSubscription(pub, subscription, reminders) {
  const data = loadSubscriptions();
  data[pub] = { subscription, reminders, updatedAt: new Date().toISOString() };
  persist(data);
}

export function removeSubscription(pub) {
  const data = loadSubscriptions();
  delete data[pub];
  persist(data);
}

export function getAll() {
  return loadSubscriptions();
}
