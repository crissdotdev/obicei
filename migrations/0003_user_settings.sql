CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  global_reminder_enabled INTEGER NOT NULL DEFAULT 0,
  global_reminder_hour INTEGER NOT NULL DEFAULT 20,
  global_reminder_minute INTEGER NOT NULL DEFAULT 0
);
