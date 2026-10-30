# Phase 04 — Offline Sidecar, Durable Jobs & Metadata Backup (2026-10-30)

## Development scope / truthfulness

Phase04 is under **Single-Owner Private** policy on branch `feat/next-phase-04`, [Draft PR #8](https://github.com/0xstillb/Grimmlink-Next/pull/8), base integration `9a9ae6e0`. Development status: **DEV_CHECKS_PASS_WITH_DEFERRED_RISKS** for offline development only; NOT a deployment or live Official acceptance. Independent security review is NOT a Phase04 gate; it remains Phase09 only.

### Implemented
- `packages/ingestion/src/sidecar.ts`: bounded strict UTF-8 JSON metadata preview (modern and legacy flat), OPF primary and opt-in missing-OPF fallback, explicit confirmation returns a preview only. Adjacent NAS write DISABLED.
- `packages/persistence/src/recovery-jobs.ts` and migration `0002_phase04_recovery.sql`: durable immutable jobs, exclusive SQLite lease, paused control, cancel, bounded explicit failed retry with deterministic jitter; expired leases and uncertain HTTP outcomes become UNKNOWN and never auto-retry. DONE requires matching hash of a mocked readback. Durable structured event receipts, no RAW TRACE.
- `packages/persistence/src/backup-bundle.ts`: local JSON metadata-only bundle with schema/version/manifest/hash, private exclusive file creation, read/sha verification, and mutation-free restore preview. Cover payloads not included; cover apply OFF.
- `packages/jobs/src/event-wire.ts` + `apps/adapter/src/recovery-routes.ts`: typed event replay Last-Event-ID, snapshot GET fallback, owner-gated route factory with fake authorization test. The actual production Adapter DOES NOT mount this factory; no live auth, SSE or upstream write exposure.
- Isolated negative/unit tests for malformed Sidecars, backup corruption/overwrite, temporary SQLite restart/lease unknown and fake NAS_OFFLINE/OFFICIAL_OFFLINE, SSE fake owner.
- `.github/workflows/phase04-offline.yml`: frozen install/build/types/lint/Prettier, isolated tests, historical Phase00 integrity, no-live-write checks.

### Verified vs pending
- [Phase04 CI #41011043528](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41011043528) **SUCCESS** at `7d35765` with *temporary in-CI formatting*; that run is not the final code or a clean-prettier exact-HEAD proof.
- Verified later source `41f328d2b81f2ac36f79f0367594e50c5b7d42f2`: [Phase04 offline CI #41011895509](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41011895509) **SUCCESS** (without CI formatter); [Phase00 #41011895521](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41011895521) **SUCCESS DESIGN-ONLY**; [Phase02 Gateway #41011895512](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41011895512) **SUCCESS MOCK ONLY**. Phase01 and pinned Spring jobs were still running at the time recorded; check live.
- After this documentation/status commit, CI must be separately checked on that new exact head. Do not transfer the earlier PASS.
- Real Official metadata backup/readback/apply/restore, authenticated owner session wiring, NAS hardware, complete Sidecar legacy formats, full cover/photo rollback, real database disaster recovery: **NOT DONE**. Physical E2E: **DEFERRED_TO_PHASE09**.

### Safety invariants
Official gateway `DENY_ALL`, metadataApply and adjacent NAS write `OFF`, restoration `PREVIEW_ONLY`, user-defined one-owner scope, no multi-user RBAC, production `NOT_AUTHORIZED`, single independent security review/remediation Phase09 only.

### Next work
1. Confirm new exact-head CI after this checkpoint and later dependent workflows; correct findings.
2. Harden bundle/file atomicity, add true trusted owner auth and Official CAS/readback only after Phase09 operational enablement prerequisites; preserve no-write until then.
3. Create separate Phase05 branch only after truthful CI/handoff; never merge Draft PR without owner approval.

## Phase04 closure extension — approved integration merge, 2026-10-30

Development scope extended to include real, persisted **local** recovery behavior and **isolated-memory mock** Official restore confirmation. This is not a real Official API write or actual production restore. See final CI for the exact HEAD, not earlier green runs.

- Added `0003_phase04_closure.sql` with exclusive book-plan locks, individual metadata/cover receipts, and local outbox reservation ownership.
- Added `phase04-queue.ts`: one active book plan; automatic stale lease quarantine to UNKNOWN; bounded sequential fake workers; crash-safe outbox reservation/UNCERTAIN and explicit reconciliation; no duplicate UNKNOWN retries. Failed jobs can be explicitly retried under bounded backoff. Receipt and lock updates are transactional.
- Added `restore-mock.ts`: canonical single-owner isolated fake book metadata snapshot, preview token bound to bundle hash and current fake revision, explicit confirm, idempotent bundle-bound fake apply, and matching fake readback; simulates Official offline, HTTP 200 mismatch and lost response. No network or Official token.
- Added `apps/adapter/src/backup-routes.ts`: mock-only owner + CSRF protected backup preview and confirm contract; not mounted by `server.ts`. Actual GET/SSE job read factory remains disabled in live Adapter.
- Tests cover fake mismatch and pre-dispatch outage, owner/CSRF denial, exclusive lock, SQLite restart, outbox UNKNOWN, job receipts and deliberate restart reconciliation.

**Feature safety boundary:** live Official restore/apply, user sessions, NAS writes and all physical E2E remain OFF/NOT RUN. Backup JSON is scalar metadata-only, not a complete Official/EPUB/cover/annotation backup or a production rollback. One consolidated Independent Security Review and remediation remains Phase09; no Phase04 independent security review is required.

**Merge:** user explicitly approved integration merge after completion; PR #8 remains unmerged until exact-head source CI succeeds. This document is a pre-merge snapshot; check the actual PR and integration HEAD for merge receipt.
