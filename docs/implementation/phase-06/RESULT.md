# Phase 06 — EPUB XPointer/CFI, PDF Progress and Continue Reading (2026-10-30)

**Scope:** Single-Owner Private, offline synthetic fixtures + local SQLite only. **Development code committed, exact-head CI pending.** This is not operational synchronization, not actual cross-reader success, and not a security approval.

**GitHub:** [PR #10](https://github.com/0xstillb/Grimmlink-Next/pull/10) `feat/next-phase-06` → `integration/grimmlink-next`. Base is merged Phase05 `3b5321ede76f74fd1d94ebaece119fc4f6f11aaf`. `main` unchanged.

## Delivered implementation
- `packages/sync/src/phase06.ts`: exact-match **synthetic** EPUB anchor catalog, paired XPointer and CFI with one SHA256 edition, BookId, BookFileId, spine href and identical text anchor. Every unknown, ambiguous, changed chapter, stale edition or missing quote fails closed. It does **not** derive/guess CFI from arbitrary XPointer or parse actual EPUB bytes. It exposes `OFFLINE_SYNTHETIC_FIXTURE_ONLY` explicitly; no general conversion coverage claim.
- PDF one-based page number with equal fixture-confirmed total pages, no fractional in-page position or fabricated percent.
- Continue Reading local projection selecting highest accepted **server revision**, not device timestamp or greatest page; conflicting events at same revision reject, empty state stays `NO_POSITION`, percent is `null`.
- `packages/persistence/migrations/0005_phase06_progress.sql` + `phase06-progress.ts`: single-owner file/edition lock, SQLite persistent PDF/EPUB mock progress, transactional CAS, event-id idempotency and collision rejection, paired-device token expiry/revocation, local resume read. No real Official login, no mounted network route, no adapter write.
- Tests: synthetic bilingual chapter roundtrip, edition drift, changed anchors/ambiguous catalog, PDF page boundaries and page counts, continue-reading revision races, SQLite restart, replay and revoked device.
- `.github/workflows/phase06-offline.yml`: frozen install/native SQLite, build/typecheck/format/lint/all unit tests, historical Phase00 integrity, unchanged operational deny switches. Historical Phase00 gate extended to fail-closed Phase06 checkpoint and regression tests.
- Existing `syncCapability.positionBridge=false` and `nativeKOSyncProgress=false` remain **OFF**. Data from this phase cannot currently be synced with real KOReader, Readest, CrossPoint or Official Grimmory.

## Evidence / verification
- Initial PR commit `46902799ecc1d776c3a92a3f23b26291a4350252`: [Phase06 CI #41046094151](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41046094151) **FAILED** from a TS implicit-any anchor segment. Fixed in later commit `64c80d2381396df1e58c8b85ce4f0aef4f894b1b`.
- The new TypeScript fixtures were reformatted with pinned Prettier in `c8629a9ff911dc8b426dee78b135482aa06e9d1c` and the temporary formatter workflow was removed. **Never cite these earlier CI runs as proof of a later HEAD**.
- Run the full current exact-HEAD CI after this RESULT and HANDOFF commit and record observed runs in HANDOFF. Until then status is `CODE_IMPLEMENTED_CI_PENDING`.

## Phase09 deferred / limitations
1. Actual binary EPUB and PDF golden source fixtures, EPUB container/spine parser and verified real DOM text anchor extraction; synthetic anchors are not proof of file correctness.
2. Exact KOReader v2026.07.1 ↔ Readest v0.12.16 ↔ CrossPoint TH physical roundtrip, CFI/XPointer normalizations, real PDF page-count parsing and history semantics.
3. Official atomic owner-book-file entitlement, authenticated client/device bridge, Native KOSync and managed writes, protected ingress, real NAS/Hermes E2E and one consolidated Independent Security Review with remediation.
4. KO binary partial-MD5 helper/golden EPUB still unverified from Phase05. No magic migration across different editions, formats or unsupported locations.

**Safety:** Official forwarding `DENY_ALL`; Native KOSync, managed projection, personal and session writes `OFF`; adapter Phase06 routes **not mounted**, production `NOT_AUTHORIZED`; one owner without multi-tenant RBAC.

**Next:** verify exact-head CI; resolve only actual failures, then close development handoff and optionally merge **integration only**, never `main`/production without explicit release approval. Phase07 may begin after safe handoff; independent review is not a Phase06 gate.
