# Phase 04 — Offline Sidecar, Durable Jobs & Metadata Backup (2026-10-30)

## Development scope / truthfulness

Phase04 is under **Single-Owner Private** policy on branch `feat/next-phase-04`, [Draft PR #8](https://github.com/0xstillb/Grimmlink-Next/pull/8), base integration `9a9ae6e0`. Development status: **IN_PROGRESS_FAIL_CLOSED** pending final exact-HEAD tests, not a deployment or live Official acceptance. Independent security review is NOT a Phase04 gate; it remains Phase09 only.

### Implemented
- `packages/ingestion/src/sidecar.ts`: bounded strict UTF-8 JSON metadata preview (modern and legacy flat), OPF primary and opt-in missing-OPF fallback, explicit confirmation returns a preview only. Adjacent NAS write DISABLED.
- `packages/persistence/src/recovery-jobs.ts` and migration `0002_phase04_recovery.sql`: durable immutable jobs, exclusive SQLite lease, paused control, cancel, bounded explicit failed retry with deterministic jitter; expired leases and uncertain HTTP outcomes become UNKNOWN and never auto-retry. DONE requires matching hash of a mocked readback. Durable structured event receipts, no RAW TRACE.
- `packages/persistence/src/backup-bundle.ts`: local JSON metadata-only bundle with schema/version/manifest/hash, private exclusive file creation, read/sha verification, and mutation-free restore preview. Cover payloads not included; cover apply OFF.
- `packages/jobs/src/event-wire.ts` + `apps/adapter/src/recovery-routes.ts`: typed event replay Last-Event-ID, snapshot GET fallback, owner-gated route factory with fake authorization test. The actual production Adapter DOES NOT mount this factory; no live auth, SSE or upstream write exposure.
- Isolated negative/unit tests for malformed Sidecars, backup corruption/overwrite, temporary SQLite restart/lease unknown and fake NAS_OFFLINE/OFFICIAL_OFFLINE, SSE fake owner.
- `.github/workflows/phase04-offline.yml`: frozen install/build/types/lint/Prettier, isolated tests, historical Phase00 integrity, no-live-write checks.

### Verified vs pending
- [Phase04 CI #41011043528](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41011043528) **SUCCESS** at `7d35765` with *temporary in-CI formatting*; that run is not the final code or a clean-prettier exact-HEAD proof.
- Latest CI for the completed branch and docs: **READ LIVE — NOT YET VERIFIED AT THIS CHECKPOINT**.
- Real Official metadata backup/readback/apply/restore, authenticated owner session wiring, NAS hardware, complete Sidecar legacy formats, full cover/photo rollback, real database disaster recovery: **NOT DONE**. Physical E2E: **DEFERRED_TO_PHASE09**.

### Safety invariants
Official gateway `DENY_ALL`, metadataApply and adjacent NAS write `OFF`, restoration `PREVIEW_ONLY`, user-defined one-owner scope, no multi-user RBAC, production `NOT_AUTHORIZED`, single independent security review/remediation Phase09 only.

### Next work
1. Confirm exact-head CI for all relevant workflows; correct findings.
2. Harden bundle/file atomicity, add true trusted owner auth and Official CAS/readback only after Phase09 operational enablement prerequisites; preserve no-write until then.
3. Create separate Phase05 branch only after truthful CI/handoff; never merge Draft PR without owner approval.
