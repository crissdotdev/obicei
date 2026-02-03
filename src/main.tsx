import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';
import { startReminderChecker, syncAllRemindersToServer, syncGlobalReminderToServer } from './lib/notifications';
import { initPushIfNeeded } from './lib/push';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Start in-app reminder checker (fallback when tab is open)
startReminderChecker();

// Re-establish push subscription + sync reminders for returning users
initPushIfNeeded()
  .then(() => syncAllRemindersToServer())
  .catch(() => {});

// Re-sync global reminder UTC offset (handles DST drift)
syncGlobalReminderToServer().catch(() => {});

// Check for service worker updates periodically (every 60 minutes)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);
  });
}
