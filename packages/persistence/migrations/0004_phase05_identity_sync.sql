CREATE TABLE IF NOT EXISTS single_owner (
  slot INTEGER PRIMARY KEY CHECK (slot = 1),
  owner_id TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS paired_reader_devices (
  device_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  token_sha256 TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS paired_reader_owner_idx ON paired_reader_devices(owner_id, revoked_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS phase05_writer_state (
  document_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  book_file_id TEXT NOT NULL,
  edition_sha256 TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('DISABLED', 'MOCK_MANAGED')),
  revision INTEGER NOT NULL DEFAULT 0,
  native_position TEXT,
  last_event_id TEXT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS phase05_mock_sync_events (
  event_id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('LOCAL_RECORDED', 'CONFLICT')),
  observed_revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(document_id) REFERENCES phase05_writer_state(document_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS phase05_event_doc_idx ON phase05_mock_sync_events(document_id, created_at);
