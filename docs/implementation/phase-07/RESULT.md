# Phase 07 — KOReader Lua, Shelf, Personal Records and Reading Sessions

**2026-10-30: offline preview package added after the earlier tested source.** This checkpoint does not claim sync readiness or real reader compatibility; new changes require exact-head CI.

Current reconciliation work is on Draft [PR #13](https://github.com/0xstillb/Grimmlink-Next/pull/13), based on integration `68b7d74daecdacc909ac095c86f6f95aed84ffe7`. Plugin/menu source commit: `40f960135c8b12fb85b2182a0a29c4d8eb0459ed`. Local Lua syntax, menu callback mock, and deterministic ZIP checks passed; exact-head GitHub CI is queued for this source.

Source branch: feat/next-phase-07 stacked on Phase06 feat/next-phase-06 at ae66c0b6dec46222110a04417e2545792d244f8c. Integration is still Phase05 3b5321ede76f74fd1d94ebaece119fc4f6f11aaf; main untouched.

## Implemented (offline synthetic only)

- Installable KOReader UI preview at `plugins/koreader/grimmlink_next.koplugin/`: valid `_meta.lua`/`main.lua`, Tools menu with Status, Connection, Progress, Sessions, Shelves, Personal Data and Diagnostics entries, plus a deterministic ZIP packager. All network and sync actions explain that the offline preview is disabled; no credentials, network or file writes.
- Bounded Lua offline core: event envelope and **manual** shelf preview; the menu preview is not the GrimmLink sync client.
- packages/personal: strict personal payload contract for ratings (1–5), bookmarks and annotations; deterministic manual shelf diff. No reset-rating or personal bridge enablement.
- Guarded Fastify mock route factory (not mounted) for reader personal GET/PUT, session events, and CSRF-protected owner manual-shelf preview, with HTTP negative tests.
- Local SQLite migration 0006: immutable owner/book/file/edition registration, personal records, CAS/event replay receipts, reading session lifecycle, no remote outbox dispatch.
- Paired token verified inside SQLite transactions before writes and replays; immutable file owner/edition, record revision CAS, event-id collision rejection, deletion tombstones for notes/bookmarks, no rating reset. Session STOP bound to creator device with mock trusted clock, 24h maximum, no client clock priority.
- Read-only manual shelf preview validates every file and reports delta without changing membership. Restart, race/replay, edition mismatch, revocation, session and Lua negative fixtures.
- Isolated Phase07 GitHub Actions: frozen install, build, typecheck, Prettier, lint, all Vitest, Lua5.4 test, Phase00 integrity, deny switches.

## Not implemented / Phase09 obligations

KOReader device runtime smoke test, sync implementation, real annotation DB/metadata schema, Official authenticated book/file/record entitlement, actual shelf mutation/Personal API, durable remote queue with UNKNOWN reconcile, multi-reader golden annotation and sessions, host/NAS/Hermes E2E. The ZIP is installable as an offline UI preview only, not a ready-to-use sync plugin or cross-device sync solution.

All personal/session bridge capabilities OFF; Native KOSync OFF, Official Gateway DENY_ALL; no live routes mounted; no production deployment. One consolidated independent security review/remediation in Phase09, not required for safe offline Phase07 development.

## Verification

**Verified tested-source commit:** [48c0fafd](https://github.com/0xstillb/Grimmlink-Next/commit/48c0fafd3095ed2d81066514345edf91612443b9). [Phase07 offline CI #41058248957](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41058248957) **SUCCESS** at that exact code/document source. Included frozen pnpm install, better-sqlite3 rebuild, full build/types/Prettier/lint/Vitest, Lua5.4 mock, Phase00 historical security release-gate and failure-case tests, and no-operational-write assertions. Explicit Phase07 historical-gate regression cases also passed. **The final documentation closure commit requires its own exact-head CI verification**; this result alone never approves live Personal API/installed KOReader/production.
