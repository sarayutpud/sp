-- Local SQLite Day-1 schema (mirrors cloud subset)
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO app_meta (key, value) VALUES ('schema_version', '1');

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  event_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS play_by_play (
  event_id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  period INTEGER NOT NULL,
  type TEXT NOT NULL,
  hlc_json TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  voided_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS on_court (
  game_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  slot INTEGER NOT NULL,
  PRIMARY KEY (game_id, team_id, slot)
);

CREATE TABLE IF NOT EXISTS undo_stack (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
