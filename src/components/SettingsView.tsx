import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { requestNotificationPermission, setGlobalReminder } from '../lib/notifications';
import { subscribeToPush } from '../lib/push';
import { localToUtc, utcToLocal } from '../lib/timezone';

interface Settings {
  globalReminderEnabled: boolean;
  globalReminderHour: number;
  globalReminderMinute: number;
}

export default function SettingsView() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(20);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<Settings>('/settings').then((data) => {
      setReminderEnabled(data.globalReminderEnabled);
      const local = utcToLocal(data.globalReminderHour, data.globalReminderMinute);
      setReminderHour(local.hour);
      setReminderMinute(local.minute);
      setGlobalReminder(data.globalReminderEnabled, local.hour, local.minute);
      setLoaded(true);
    }).catch(() => {
      setLoaded(true);
    });
  }, []);

  const save = async (enabled: boolean, hour: number, minute: number) => {
    setGlobalReminder(enabled, hour, minute);
    const utc = localToUtc(hour, minute);
    await api.put('/settings', {
      globalReminderEnabled: enabled,
      globalReminderHour: utc.hour,
      globalReminderMinute: utc.minute,
    }).catch((err) => console.error('Failed to save settings:', err));
  };

  const handleReminderToggle = async () => {
    if (!reminderEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      subscribeToPush().catch(() => {});
    }
    const newEnabled = !reminderEnabled;
    setReminderEnabled(newEnabled);
    save(newEnabled, reminderHour, reminderMinute);
  };

  const handleTimeChange = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    setReminderHour(h);
    setReminderMinute(m);
    save(reminderEnabled, h, m);
  };

  const timeValue = `${String(reminderHour).padStart(2, '0')}:${String(reminderMinute).padStart(2, '0')}`;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-[16px] py-[12px] border-b border-[var(--primary-15)] shrink-0">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-[2px] font-mono text-[16px] text-[var(--accent)] bg-transparent border-none cursor-pointer rounded-[6px] transition-colors duration-100 active:bg-[var(--primary-06)]"
        >
          <ChevronLeft size={20} strokeWidth={2} />
          Back
        </button>
        <h2
          className="text-[17px] text-[var(--primary)]"
          style={{ fontFamily: "'Ndot57Regular', monospace" }}
        >
          Settings
        </h2>
        <div className="w-[60px]" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-[16px] space-y-[24px]">
        {loaded && (
          <div>
            <div className="flex items-center justify-between">
              <label className="font-mono text-[16px] text-[var(--primary)]">
                Daily Reminder
              </label>
              <button
                onClick={handleReminderToggle}
                className={`relative w-[51px] h-[31px] rounded-full border-none cursor-pointer transition-colors ${
                  reminderEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--primary-30)]'
                }`}
              >
                <div
                  className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-sm transition-transform"
                  style={{
                    transform: reminderEnabled ? 'translateX(22px)' : 'translateX(2px)',
                  }}
                />
              </button>
            </div>
            <p className="font-mono text-[12px] text-[var(--secondary)] mt-[4px]">
              Get a daily nudge to track your habits
            </p>
            {reminderEnabled && (
              <input
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="mt-[12px] w-full px-[12px] py-[10px] font-mono text-[16px] text-[var(--primary)] bg-[var(--primary-06)] rounded-[8px] border-none outline-none"
              />
            )}
          </div>
        )}

        {/* Logout */}
        <div className="pt-[24px] border-t border-[var(--primary-15)]">
          <button
            onClick={logout}
            className="flex items-center gap-[8px] font-mono text-[16px] text-[var(--secondary)] bg-transparent border-none cursor-pointer rounded-[6px] transition-colors duration-100 active:bg-[var(--primary-06)]"
          >
            <LogOut size={18} strokeWidth={2} />
            Log Out
          </button>
        </div>

        <p className="text-center font-mono text-[11px] text-[var(--secondary)] opacity-40">
          v{__APP_VERSION__}
        </p>
      </div>
    </div>
  );
}
