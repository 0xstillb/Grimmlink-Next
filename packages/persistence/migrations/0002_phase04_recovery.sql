CREATE TABLE durable_jobs (
 id text PRIMARY KEY NOT NULL,
 kind text NOT NULL CHECK (kind IN ('METADATA_MOCK','COVER_MOCK','RESTORE_PREVIEW')),
 book_id text NOT NULL,
 plan_hash text NOT NULL,
 idempotency_key text NOT NULL UNIQUE,
 state text NOT NULL CHECK (state IN ('PENDING','LEASED','FAILED','UNKNOWN','DONE','CANCELED')),
 paused integer NOT NULL DEFAULT 0 CHECK (paused IN (0,1)),
 attempts integer NOT NULL DEFAULT 0,
 max_attempts integer NOT NULL CHECK (max_attempts BETWEEN 1 AND 5),
 due_at integer NOT NULL,
 lease_owner text,
 lease_until integer,
 last_code text,
 created_at integer NOT NULL,
 updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX durable_jobs_due ON durable_jobs (state, paused, due_at, created_at);
--> statement-breakpoint
CREATE TABLE job_events (
 seq integer PRIMARY KEY AUTOINCREMENT,
 job_id text NOT NULL REFERENCES durable_jobs(id),
 transition text NOT NULL,
 code text NOT NULL,
 occurred_at integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX job_events_job_seq ON job_events (job_id, seq);

