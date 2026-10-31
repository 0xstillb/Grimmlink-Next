# Phase 07 — KOReader Lua, Shelf, Personal Records and Reading Sessions

**2026-10-31 reconciliation checkpoint.** Current Draft [PR #13](https://github.com/0xstillb/Grimmlink-Next/pull/13) targets `integration/grimmlink-next` at `68b7d74daecdacc909ac095c86f6f95aed84ffe7`. Latest menu source is `59175dc0e866dec7f74189f243a6a4d65a478f73`. All 10 exact-head workflows passed, including the inherited Phase01 ARM64 image build and smoke test.

**Latest live PR-head verification (2026-10-31):** all **12/12 GitHub checks passed** at current PR #13 head `75301ed8fbb270ef98c2b926cb9136c904fe3533`, including `offline-personal`, `offline-progress`, `offline-recovery`, `ui-package`, ARM64, pinned runtime, and Phase00 checks. Phase07 coding is complete for the documented offline/mock scope. The KOReader package has **not** been installed on a physical reader; no live Grimmory or Official sync was run. Those checks remain Phase09.

The offline menu now groups Connection/setup, sync actions, reading/session/shelf/personal data, Advanced Settings (Setup & Backup and Shelf Settings), Diagnostics and About. Every plugin callback remains an offline information preview; it makes no network request, credential access, book write or shelf mutation. Local Lua syntax/mock and deterministic ZIP checks passed. The ZIP SHA-256 is `18E3CBB0F10B6A518F7C79A9837CEA6E52A2F08E5C7091D2EFA470CA7BD7153A`.

Source branch: feat/next-phase-07 stacked on Phase06 feat/next-phase-06 at ae66c0b6dec46222110a04417e2545792d244f8c. Integration is still Phase05 3b5321ede76f74fd1d94ebaece119fc4f6f11aaf; main untouched.

## Implemented (offline synthetic only)

- Installable KOReader UI preview at `plugins/koreader/grimmlink_next.koplugin/`: valid `_meta.lua`/`main.lua`, GrimmLink-like menu categories and a deterministic ZIP packager. Actions are offline information previews; no credentials, network or file writes.
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

**Current exact-head evidence:** [Phase07 offline CI #41172702405](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41172702405) **SUCCESS** at `59175dc0e866dec7f74189f243a6a4d65a478f73`. All 10 PR-head workflows passed, including Phase01 ARM64 image build/smoke and Phase02 pinned Spring evidence. This proves offline package/menu checks, not a physical KOReader install, live sync, Official writes, or production readiness.

**Historical baseline:** the earlier code/document source `48c0fafd3095ed2d81066514345edf91612443b9` passed Phase07 CI #41058248957. That evidence remains historical and does not substitute for the current-head runs.
