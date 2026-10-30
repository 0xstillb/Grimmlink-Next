# Phase 05 — Offline Identity, Pairing and KOSync (2026-10-30)

**Status:** `DEV_CHECKS_PASS_WITH_DEFERRED_RISKS` (offline development only, **not** SYNC_CODE_REVIEWED or production-enabled). [Draft PR #9](https://github.com/0xstillb/Grimmlink-Next/pull/9), based on merged Phase04 integration commit `fe83f22fa7395a4f799df8ecc5349de71aeadb0c`. Independent security review/repair and physical E2E remain Phase09. No independent Phase05 review is required under Single-Owner Private policy.

## Implemented in feature branch

- `packages/identity/src/phase05.ts`: canonical Official bookId + bookFileId + relative path + full file SHA-256/byte length, optional explicitly tagged KO partial-MD5 candidate. Refuses traversal, missing/duplicate KO digests and stale byte editions. Identity is **not** Official book entitlement. KO digest algorithm is **UNVERIFIED** until pinned upstream-compatible helper and checked-in EPUB golden vector are available; this implementation never guesses partial-MD5.
- `packages/identity/src/filename-digest.ts`: tagged KO_FILENAME_MD5 of UTF-8 basename, exact SHA256 and BookFileId disambiguation; duplicate filenames/collisions reject. Checked against known `book.epub` filename-mode digest fixture.
- `packages/persistence/migrations/0004_phase05_identity_sync.sql` + `phase05-devices.ts`: durable one-Official-owner binding, multiple token-hashed devices, per-device expiry/revocation, mock-only file writer state and CAS revisions, conflict receipts, replay dedupe and opaque native position retention; test restart in private SQLite. No secret persisted in plaintext; no Official credential stored.
- `packages/sync/src/phase05.ts`: canonical standard KOSync auth/progress path classifier and bounded mock payload parser; reject encoded/aliased paths; CrossPoint TH/Readest compatibility remains fixture/mock-only and explicitly not live verified. No ratings/bookmarks inferred from KOSync.
- `apps/adapter/src/phase05-routes.ts`: isolated, injected owner+CSRF device pairing and reader mock progress route contract with explicit conflict results. **Factories not mounted by** `apps/adapter/src/server.ts`; no live upstream calls.
- `*.test.ts`: exact-byte/collision, SQLite restart/revocation/owner rejection, writer CAS/replay/time skew, mock wire negative paths and mock auth HTTP tests.
- `.github/workflows/phase05-offline.yml`: frozen install, native SQLite build, workspace build/typecheck/Prettier/ESLint/unit, historical Phase00 integrity and no-live-write assertions.

## Evidence and limitations

- **Verified code-source CI at `8ec70e6729fe83619b5e7cd7ee462c8f6feb90fe`:** [Phase05 #41016950913](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41016950913) **SUCCESS** (frozen install, build, typecheck, Prettier, lint, all unit/mock/SQLite tests, historical Phase00 checker and safety grep); [Phase00 #41016950807](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41016950807), [Phase02 Gateway #41016950889](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41016950889) and [Phase04 #41016950802](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41016950802) also **SUCCESS** at same source HEAD. Other long-running workflows require separate check. The earlier documentation HEAD `019c8e5d` was subsequently verified: all six workflows SUCCESS (Phase00 #41017244117, Phase01 #41017244076, Phase02 Gateway #41017244270, Phase02 Spring #41017244093, Phase04 #41017244193, Phase05 #41017244250).
- Initial exact-head [Phase05 CI #41015526965](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41015526965) FAILED due a TypeScript event result literal widening at `phase05-devices.ts:205`; corrected in subsequent [commit `86aabd09`](https://github.com/0xstillb/Grimmlink-Next/commit/86aabd09c8e00a15a6bf5bb56d0c80678e97ac97). This initial failure was fixed and subsequent source-head CI passed; do not promote the runtime based on tests.
- Real KOReader partial MD5 golden proof, real Official JWT↔KO binding and credential rotation, underlying Official book ACL and atomic entitlement, real KOSync Native forwarding, actual managed Official sync, network egress, live route authentication, physical readers, full E2E: **NOT DONE**.
- A mock `MOCK_MANAGED` local position recorder is **not** enabled `ADAPTER_MANAGED` Official integration; Native remains `BLOCKED/OFF` under ADR-025. This explicitly does **not** close the full Phase05 acceptance gate `SYNC_CODE_REVIEWED` or grant production.
- One owner/one canonical Official account; no multi-user RBAC. Multiple individually revocable reader devices. `officialGatewayForwarding=DENY_ALL`, `nativeKosyncProgress=OFF`, `personalBridge=OFF`, `productionDeployment=NOT_AUTHORIZED`.

## Remaining Phase05 work

1. Verify the new Phase05 closure documentation HEAD after source head `07b49a17`; build, types, lint, format, SQLite/mock and fail-closed tests passed on the source head.
2. Confirm KO partial-MD5 via the pinned upstream-supported helper + golden EPUB and Readest/CrossPoint fake wire traces; do not enable Native progress.
3. Preserve explicit reconciliation and deny unsupported device capabilities; Official/physical E2E remain Phase09.
4. Keep PR #9 Draft until verified phase handoff and explicit owner authorization for integration-only merge; `main` untouched.

## Phase05 code-completion extension — 2026-10-30

The latest isolated **code source** is `07b49a179ca4ac90aa3c126995efc100a729da3a`:
- Multi-reader token **rotation** is transactional: the old token becomes invalid immediately; revoked/expired devices cannot rotate and owner-side listing never returns token/hash material.
- Readest Official v0.12.16 source-pinned mock `GET /syncs/progress/:hash` accepts a missing echoed `document` but rejects a mismatched hash, invalid percentage or missing position. PUT remains bounded and explicit; client clock never chooses winners.
- KOReader **filename-mode MD5** fixtures now include five direct KOReader v2026.07.1 golden vectors from pinned `mbret/prose-reader` source, covering ASCII, Unicode composed/decomposed, Japanese and emoji. This is **not** binary partial-MD5 golden EPUB validation.
- Offline source tests [Phase05 #41037601290](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41037601290), [Phase00 #41037601388](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41037601388), [Gateway #41037601302](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41037601302), and [Phase04 #41037601338](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41037601338) **SUCCESS at this exact source**. Verify long-running Phase01 and Pinned Spring, and recheck **this new docs commit** separately before any merge.

**Phase05 development work is closed only to the permitted offline/mock depth.** Pending upstream partial MD5 golden EPUB dependency, live authenticated pairing, real book entitlements and Native/Official managed progress cannot be silently described as done: `NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF` remains an intentional hard safety decision under ADR-025, not a functional test backlog that may be ignored. Physical E2E, consolidated independent security review and remediation belong to Phase09. Actual library helper source is pinned `mbret/prose-reader@1e2a38f0`, **package not installed**; no fabricated digest results.
