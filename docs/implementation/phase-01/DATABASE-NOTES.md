# Phase01 local database constraints

Versioned Drizzle-style SQLite schema + migration 0001. This is LOCAL adapter storage, not the Grimmory production database. Schema stores job/outbox/audit metadata only: **never raw notes, book text, credentials or logger TRACE**.

- Connection sets WAL, synchronous=FULL, busy_timeout=5000, foreign_keys=ON; fails startup if a migration fails.
- Atomic job lease uses SQLite BEGIN IMMEDIATE transaction and unique idempotency index; lease expiry only makes a **local job** available. This must not be reused for remote session submission, whose UNCERTAIN no-retry contract belongs to Phase07.
- Production migration execution must first create a verified consistent SQLite backup and validate restore. Up-only migration with backup/restore rollback; no destructive down migration implemented. Do not apply automatically to deployed machines at Phase01.
- Local temporary SQLite fixture test has been committed; run proof required and NOT_RUN until CI runner posts receipt. No NAS, Official backend, device or full E2E.
- Migration file inclusion in published/package Docker image and ARM64 native better-sqlite3 install still require verification before Phase01 exit.
