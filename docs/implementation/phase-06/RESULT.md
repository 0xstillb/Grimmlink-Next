# Phase 06 — EPUB XPointer/CFI, PDF Progress and Continue Reading

## Reconciliation status — 2026-10-31

Phase 06 now has an offline DOM-position bridge and a simulated reading-state readback model on Draft [PR #13](https://github.com/0xstillb/Grimmlink-Next/pull/13), targeting `integration/grimmlink-next`. Code source [`a32103e4`](https://github.com/0xstillb/Grimmlink-Next/commit/a32103e4ef9e4104ac5885ef79dcb5ad12831390) passed all 12 exact-head checks, including Phase06, ARM64 and pinned Spring runtime evidence. The documentation checkpoint still needs exact-head CI. This is a development handoff, not live sync approval.

## Delivered implementation

- `packages/sync/src/epub-position.ts` reads bounded EPUB ZIP/container/OPF/manifest/spine/XHTML data, binds it to the supplied SHA-256 edition, and uses `@prose-reader/koreader` to convert and roundtrip CFI/XPointer through parsed DOM text anchors. Results distinguish `DOM_ANCHOR_MATCH`, `CHAPTER_ONLY` and `UNRESOLVED`; only a same-spine, same-text, successful roundtrip can create an offline exact resume candidate.
- The pinned MIT synthetic EPUB oracle fixture currently yields 313 DOM anchor matches and 23 chapter-only fallbacks. This is fixture evidence, not broad book compatibility or device E2E.
- Fixtures cover Thai combining marks, ruby, encoded/decoded EPUB hrefs with spaces, whitespace, indexed text nodes, DocFragment, embedded XHTML IDs, edition/file mismatch and native pointer preservation.
- `packages/sync/src/phase06-reading-state.ts` accepts only a changed native position with same-edition DOM roundtrip evidence and an event ID/time. It plans `READING` only from `UNREAD` or `UNSET`; all other and manually selected statuses are preserved. The plan sends no request and has no percentage.
- A separate `SIMULATED_OFFICIAL_RESPONSE` evaluator reports readStatus, lastReadTime and readProgress presence/mismatch. It reports `EXACT_RESUME` only when simulated CFI and spine href read back exactly; otherwise it reports `LOCAL_STARTED_READING`. A reported 0.0% marks the Official card as not guaranteed. Missing fields remain missing and never become guessed progress.
- PDF position mapping is one-based with a fixture-confirmed page count and supports 0/1-based index conversion. It does not parse real PDF files or infer an in-page location.
- Local Continue Reading uses accepted revision ordering, rejects conflicting same-revision observations, and never synthesizes a percentage. SQLite retains owner/file/edition binding, CAS, idempotent event replay, revocation and restart behavior. Position evidence is persisted separately from the native pointer.
- `syncCapability.positionBridge` and `nativeKOSyncProgress` remain OFF. No Official request, adapter route, device write or production action is enabled.

## Verification

Local direct-workspace checks at code source `a32103e4ef9e4104ac5885ef79dcb5ad12831390`:

- Phase06 sync/EPUB tests: **16/16 passed** across `phase06.test.ts`, `phase06-reading-state.test.ts` and `epub-position.test.ts`.
- `tsc --noEmit -p packages/sync/tsconfig.json`: passed.
- Targeted Prettier and ESLint for changed Phase06 files: passed.
- The pinned MIT fixture test validates 313 exact DOM anchors and 23 chapter-only fallbacks.
- [Phase06 offline CI #41172155176](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41172155176) passed at that exact code source. All 12 current PR check runs passed there, including [ARM64/foundation #41172155203](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41172155203) and [pinned Spring runtime #41172155219](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41172155219). Corepack could not download the pinned pnpm package because registry DNS was unavailable; installed workspace binaries were used locally. The exact documentation head still needs its own check.

## Limits and Phase09 carry-forward

- `EPUB_DOM_ROUNDTRIP_ONLY` means parsed fixture/DOM evidence; it does not prove another reader stores or resumes the same position.
- Official progress DTO fields are source-inspected, but authenticated status endpoint side effects and real readback are not verified. Pinned native KOReader sync can derive status from percentage thresholds and overwrite manually chosen states; this bridge therefore remains a no-transport simulation and does not send percentage.
- PDF page count remains fixture-supplied; no real PDF parser or reader is connected.
- Actual KOReader/Readest/CrossPoint roundtrip, real Official owner authentication/authorization, NAS/Hermes, device install/runtime and full-stack E2E are Phase09. One consolidated independent security review/remediation is also Phase09.
- Official forwarding remains `DENY_ALL`; protected writes and all sync capabilities remain OFF; production is `NOT_AUTHORIZED`.

## Next action

Commit the truthful documentation checkpoint and recheck its exact-head CI. Update the Phase06 Notion page only after GitHub confirms the final branch/PR SHA. Continue the Phase07–08 reconciliation without enabling live writes or merging this Draft PR.
