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

  // Return existing subscription if available
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    cachedSubscription = existing;
    return existing;
  }

  // Fetch VAPID public key from server
  const res = await fetch('/api/push/vapid-public-key');
  const { publicKey } = await res.json();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  cachedSubscription = subscription;
  return subscription;
}

export async function syncRemindersToServer(
  pub: string,
  reminders: { habitId: string; habitName: string; hour: number; minute: number }[],
): Promise<void> {
  const subscription = cachedSubscription ?? (await subscribeToPush());
  if (!subscription) return;

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pub, subscription: subscription.toJSON(), reminders }),
  });
}

/** Re-establish push subscription on app load for users with existing reminders. */
export async function initPushIfNeeded(): Promise<void> {
  const reminders = JSON.parse(localStorage.getItem('obicei-reminders') || '{}');
  if (Object.keys(reminders).length === 0) return;
  if (!('PushManager' in window)) return;

  await subscribeToPush();
}

export async function unsubscribeFromPush(pub: string): Promise<void> {
  if (!('PushManager' in window)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }

  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pub }),
  });

  cachedSubscription = null;
}
