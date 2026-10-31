CREATE TABLE update_review_records (
  id TEXT PRIMARY KEY NOT NULL,
  source_id TEXT NOT NULL CHECK (source_id GLOB '[a-z]*' AND length(source_id) BETWEEN 1 AND 32),
  candidate_tag TEXT NOT NULL CHECK (length(candidate_tag) BETWEEN 1 AND 128),
  evidence_sha256 TEXT NOT NULL CHECK (length(evidence_sha256) = 64 AND evidence_sha256 NOT GLOB '*[^0-9a-f]*'),
  compatibility_manifest_sha256 TEXT NOT NULL CHECK (length(compatibility_manifest_sha256) = 64 AND compatibility_manifest_sha256 NOT GLOB '*[^0-9a-f]*'),
  compatibility TEXT NOT NULL CHECK (compatibility IN ('UNKNOWN', 'SOURCE_BASELINE_REVIEWED_COMPATIBLE', 'INCOMPATIBLE')),
  impact TEXT NOT NULL CHECK (impact IN ('UNKNOWN', 'NO_KNOWN_SOURCE_IMPACT', 'POTENTIAL_IMPACT')),
  decision TEXT NOT NULL CHECK (decision IN ('DEFERRED', 'REJECTED', 'SUBMIT_FOR_PHASE09_EVALUATION')),
  rationale TEXT NOT NULL CHECK (length(rationale) BETWEEN 20 AND 500),
  reviewer TEXT NOT NULL CHECK (reviewer = 'LOCAL_OWNER_SESSION'),
  reviewed_at INTEGER NOT NULL CHECK (reviewed_at >= 0),
  installation_allowed INTEGER NOT NULL DEFAULT 0 CHECK (installation_allowed = 0)
);
--> statement-breakpoint
CREATE INDEX update_review_records_recent ON update_review_records (reviewed_at DESC, id DESC);
--> statement-breakpoint
CREATE TRIGGER update_review_records_no_update
BEFORE UPDATE ON update_review_records
BEGIN
  SELECT RAISE(ABORT, 'UPDATE_REVIEW_RECORDS_APPEND_ONLY');
END;
--> statement-breakpoint
CREATE TRIGGER update_review_records_no_delete
BEFORE DELETE ON update_review_records
BEGIN
  SELECT RAISE(ABORT, 'UPDATE_REVIEW_RECORDS_APPEND_ONLY');
END;
