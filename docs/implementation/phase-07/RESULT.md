# Phase 07 — KOReader Lua, Shelf, Personal Records and Reading Sessions

**2026-10-30: IMPLEMENTED / CI NOT YET VERIFIED.** This checkpoint does not claim runtime readiness or real reader compatibility.

Source branch: feat/next-phase-07 stacked on Phase06 feat/next-phase-06 at ae66c0b6dec46222110a04417e2545792d244f8c. Integration is still Phase05 3b5321ede76f74fd1d94ebaece119fc4f6f11aaf; main untouched.

## Implemented (offline synthetic only)

- Bounded Lua prototype plugins/koreader/grimmlink_next_offline.lua: event envelope and **manual** shelf preview; no real KOReader installation, automatic sync, network or file I/O.
- packages/personal: strict personal payload contract for ratings (1–5), bookmarks and annotations; deterministic manual shelf diff. No reset-rating or personal bridge enablement.
- Guarded Fastify mock route factory (not mounted) for reader personal GET/PUT, session events, and CSRF-protected owner manual-shelf preview, with HTTP negative tests.
- Local SQLite migration 0006: immutable owner/book/file/edition registration, personal records, CAS/event replay receipts, reading session lifecycle, no remote outbox dispatch.
- Paired token verified inside SQLite transactions before writes and replays; immutable file owner/edition, record revision CAS, event-id collision rejection, deletion tombstones for notes/bookmarks, no rating reset. Session STOP bound to creator device with mock trusted clock, 24h maximum, no client clock priority.
- Read-only manual shelf preview validates every file and reports delta without changing membership. Restart, race/replay, edition mismatch, revocation, session and Lua negative fixtures.
- Isolated Phase07 GitHub Actions: frozen install, build, typecheck, Prettier, lint, all Vitest, Lua5.4 test, Phase00 integrity, deny switches.

## Not implemented / Phase09 obligations

KOReader Lua plugin runtime integration, real annotation DB/metadata schema, Official authenticated book/file/record entitlement, actual shelf mutation/Personal API, durable remote queue with UNKNOWN reconcile, multi-reader golden annotation and sessions, host/NAS/Hermes E2E. This is **not** a ready-to-install plugin or a claimed cross-device sync solution.

All personal/session bridge capabilities OFF; Native KOSync OFF, Official Gateway DENY_ALL; no live routes mounted; no production deployment. One consolidated independent security review/remediation in Phase09, not required for safe offline Phase07 development.

## Verification

GitHub Actions status: **PENDING** until exact branch commit concludes. Do not interpret previous Phase06 success as Phase07 proof. Verify latest commit and attach CI receipt before moving to DEV_CHECKS_PASS_WITH_DEFERRED_RISKS.
