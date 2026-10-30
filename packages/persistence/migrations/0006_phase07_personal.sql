-- Phase07: offline synthetic same-owner, exact file+edition scoped personal data.
-- No Official writes, remote session transmission or automatic shelf membership mutation.
CREATE TABLE phase07_files (
  book_file_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  edition_sha256 TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE phase07_personal_records (
  book_file_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('RATING','BOOKMARK','ANNOTATION')),
  record_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision >= 1),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1)),
  value_json TEXT,
  last_event_id TEXT NOT NULL,
  PRIMARY KEY(book_file_id,kind,record_id),
  FOREIGN KEY(book_file_id) REFERENCES phase07_files(book_file_id)
);
--> statement-breakpoint
CREATE TABLE phase07_personal_events (
  event_id TEXT PRIMARY KEY,
  book_file_id TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('LOCAL_RECORDED','CONFLICT')),
  observed_revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(book_file_id) REFERENCES phase07_files(book_file_id)
);
--> statement-breakpoint
CREATE INDEX phase07_personal_event_file_idx ON phase07_personal_events(book_file_id,created_at);
--> statement-breakpoint
CREATE TABLE phase07_sessions (
  session_id TEXT PRIMARY KEY,
  book_file_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision IN (1,2)),
  FOREIGN KEY(book_file_id) REFERENCES phase07_files(book_file_id)
);
--> statement-breakpoint
CREATE INDEX phase07_session_file_idx ON phase07_sessions(book_file_id,started_at);
--> statement-breakpoint
CREATE TABLE phase07_session_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('LOCAL_RECORDED','CONFLICT')),
  observed_revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
