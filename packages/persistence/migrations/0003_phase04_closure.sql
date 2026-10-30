CREATE TABLE active_plan_locks (
 book_id text PRIMARY KEY NOT NULL,
 job_id text NOT NULL UNIQUE REFERENCES durable_jobs(id)
);
--> statement-breakpoint
CREATE TABLE job_step_receipts (
 job_id text NOT NULL REFERENCES durable_jobs(id),
 step text NOT NULL CHECK (step IN ('METADATA','COVER')),
 status text NOT NULL CHECK (status IN ('VERIFIED','UNKNOWN')),
 fingerprint text NOT NULL,
 occurred_at integer NOT NULL,
 PRIMARY KEY (job_id,step)
);
--> statement-breakpoint
ALTER TABLE outbox ADD COLUMN lease_owner text;
