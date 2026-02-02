-- Rate limiting for auth endpoints
CREATE TABLE auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);

CREATE INDEX idx_auth_attempts_lookup ON auth_attempts(ip, endpoint, attempted_at);
