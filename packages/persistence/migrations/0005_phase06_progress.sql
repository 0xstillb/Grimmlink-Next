CREATE TABLE IF NOT EXISTS phase06_offline_progress (
  book_file_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('EPUB','PDF')),
  edition_sha256 TEXT NOT NULL,
  verified_fixture_page_count INTEGER,
  revision INTEGER NOT NULL DEFAULT 0,
  position_kind TEXT,
  native_position TEXT,
  page_number INTEGER,
  last_event_id TEXT,
  CHECK ((format='EPUB' AND verified_fixture_page_count IS NULL) OR
         (format='PDF' AND verified_fixture_page_count BETWEEN 1 AND 100000))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS phase06_offline_events (
  event_id TEXT PRIMARY KEY,
  book_file_id TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('LOCAL_RECORDED','CONFLICT')),
  observed_revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (book_file_id) REFERENCES phase06_offline_progress(book_file_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS phase06_events_file_idx
 ON phase06_offline_events(book_file_id,created_at);
