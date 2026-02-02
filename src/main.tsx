import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App';
import { startReminderChecker, syncAllRemindersToServer } from './lib/notifications';
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
