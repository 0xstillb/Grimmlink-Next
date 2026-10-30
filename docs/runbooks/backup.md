# Phase04 — Local metadata bundle & recovery (offline only)

This runbook documents **development APIs and tests**, not a production restore procedure. Grimmory Official stays the source of truth; no direct database or NAS write exists.

## Sidecar preview
`parseSidecarPreview(bytes)` accepts a bounded, strict UTF-8 JSON object with optional `metadata` wrapper; unsupported keys are ignored. `selectMetadataSource(opfPresent, optedIn)` always chooses OPF when present; only when absent and explicitly opted in may Sidecar be selected. `planManualSidecarImport(preview, ownerConfirmed)` returns `PREVIEW_ONLY`, never a mutating operation.

## Local backup (metadata-only)
Create a `buildMetadataBundle(snapshots, createdAt)` of allowed scalar keys; verify the SHA-256 manifest. Call `writeMetadataBundleFile(destination, bundle)` into an **already existing, private 0700, process-owned** local directory. Exclusive private 0600 temp file, fsync + link publish prevents silent overwrite. Read with `readMetadataBundleFile(path)`; `previewMetadataRestore(bundle)` produces book IDs and hash only. Never treat it as a full Official/EPUB/annotation/cover backup. Cover fingerprint is documentary, not cover bytes; cover apply disabled.

No live restore-confirm endpoint or Official readback is wired. Do **not** use this bundle to overwrite Official data or assume rollback; future production rollback requires safe authenticated CAS, current revisions, and independently verified API readbacks.

## Durable queue recovery
SQLite migration `0002_phase04_recovery` adds `durable_jobs` and `job_events`. An immutable idempotency key de-duplicates plans. Leases expire into `UNKNOWN`, not `PENDING`; uncertain POST must be reconciled with authoritative same-owner readback before marking DONE, or with verified absence before eligible explicit failed retry. **No automatic UNKNOWN retry.** Only verified failed-before-dispatch outcomes may be manually retried with capped exponential backoff. A fake HTTP 200 without matching readback is not success.

`registerOfflineRecoveryReadRoutes` is a factory for **injected trusted owner authentication** with GET snapshot and finite Last-Event-ID SSE replay. It is NOT mounted in the live Adapter. Actual authenticated enablement needs a separate trusted owner session and route safety proof.

## Validation
GitHub Actions `phase04-offline.yml`: offline frozen pnpm, build/typecheck/lint/Prettier, mock SQLite crash/outage tests, Phase00 integrity and explicit DENY_ALL/OFF check. Real Grimmory, Hermes, NAS, KOReader, Readest and physical X4 Pro tests are reserved for Phase09.

## Recovery limitations
No Official snapshot enumeration, no live metadata restore, no rollback of real Official writes, no physical NAS hardening or absolute symlink-race proof. Preserve Phase09 ledger and explicit owner release approval.

## Phase04 simulated restore and durable jobs (offline development)

`createIsolatedMockRestore(initialSnapshots, canonicalOwnerId)` provides a memory-only fake Official. `backupCurrent(ownerId, timestamp)` generates an actual metadata-only JSON bundle from the fake current record state; save with `writeMetadataBundleFile`, then verify on disk with `readMetadataBundleFile`. `preview(bundle, ownerId)` validates that books exist and creates a hash token binding current fake revisions to the bundle SHA-256; it performs no mutation. `confirm(bundle, preview, true, idempotencyKey)` refuses stale or unconfirmed plans and applies only to fake in-memory records with readback, returning explicit VERIFIED, FAILED, or UNKNOWN. Duplicate idempotency keys are bound to the original bundle and cannot re-apply uncertain posts. `reconcile(bundle, idempotencyKey)` rechecks the fake record after an UNKNOWN response. Covers are never written.

`enqueueExclusivePlan` limits one active local metadata/cover plan per book; locks persist across SQLite restart and are released only after verified DONE or explicitly canceled non-dispatched work. `runOfflineFixtureWorker` processes a bounded number of fake jobs sequentially, with UNKNOWN quarantine after callback errors. `enqueueLocalOutbox`, `reserveLocalOutbox`, `quarantineLocalOutbox` and `reconcileLocalOutbox` provide durable local-only receipts. Never consider a timeout as confirmation that an upstream POST was not applied. No automatic retry for UNKNOWN.

`registerIsolatedBackupRoutes` models backup GET preview and POST confirm requiring an owner and CSRF; `registerOfflineRecoveryReadRoutes` models canonical job GET plus finite Last-Event-ID SSE replay. Both are injectable test factories and are **not wired** into the live Adapter/Gateway. Their fake authorization is NOT security proof. Phase09 must implement and verify real per-request owner and Official CAS rights before considering production enablement.
