import { api, getToken } from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array;
}

let cachedSubscription: PushSubscription | null = null;

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('PushManager' in window)) return null;

  const registration = await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    cachedSubscription = existing;
    return existing;
  }

  const { publicKey } = await api.get<{ publicKey: string }>('/push/vapid-public-key');

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  cachedSubscription = subscription;
  return subscription;
}

export async function syncRemindersToServer(
  reminders: { habitId: string; habitName: string; hour: number; minute: number }[],
): Promise<void> {
  const subscription = cachedSubscription ?? (await subscribeToPush());
  if (!subscription) return;

  await api.post('/push/subscribe', {
    subscription: subscription.toJSON(),
    reminders,
  });
}

export async function initPushIfNeeded(): Promise<void> {
  const reminders = JSON.parse(localStorage.getItem('obicei-reminders') || '{}');
  if (Object.keys(reminders).length === 0) return;
  if (!('PushManager' in window)) return;
  if (!getToken()) return;

  await subscribeToPush();
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('PushManager' in window)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }

  if (getToken()) {
    await api.post('/push/unsubscribe');
  }

  cachedSubscription = null;
}
