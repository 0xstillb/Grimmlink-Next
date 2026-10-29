CREATE TABLE IF NOT EXISTS `jobs` (
 `id` text PRIMARY KEY NOT NULL,
 `kind` text NOT NULL,
 `status` text DEFAULT 'PENDING' NOT NULL CHECK (`status` IN ('PENDING','LEASED','DONE','FAILED')),
 `idempotency_key` text NOT NULL,
 `lease_owner` text,
 `lease_until` integer,
 `attempt_count` integer DEFAULT 0 NOT NULL,
 `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `jobs_idempotency_unique` ON `jobs` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `jobs_lease_lookup` ON `jobs` (`status`,`lease_until`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `outbox` (
 `id` text PRIMARY KEY NOT NULL,
 `event_type` text NOT NULL,
 `state` text NOT NULL CHECK (`state` IN ('PENDING','RESERVED','UNCERTAIN','ACKED')),
 `idempotency_key` text NOT NULL,
 `created_at` integer NOT NULL,
 `reserved_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `outbox_idempotency_unique` ON `outbox` (`idempotency_key`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `audit_events` (
 `id` text PRIMARY KEY NOT NULL,
 `operation` text NOT NULL,
 `result` text NOT NULL,
 `correlation_id` text,
 `occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `runtime_settings` (
 `key` text PRIMARY KEY NOT NULL,
 `value` text NOT NULL,
 `updated_at` integer NOT NULL
);
