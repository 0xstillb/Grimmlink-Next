# Phase 01–08 reconciliation — in progress

Baseline: integration commit `68b7d74daecdacc909ac095c86f6f95aed84ffe7`,
read from GitHub on 2026-10-30. This document tracks work on the separate
`codex/phase-01-08-completion` checkout; it does not close the phases or
authorize a deployment. Each phase's live Notion scope remains the requirement.

| Phase | Evidence gathered or work added | Remaining before the phase scope can be closed |
| --- | --- | --- |
| 01 | Baseline workspace build, typecheck and lint passed. Historical foundation review applies only to its recorded source. | Recheck all current source and package/image requirements; Linux/ARM64 and recovery claims need matching evidence. |
| 02 | Isolated Official-client unit and loopback mock suite passed (27 tests) outside the Windows sandbox. | Complete and verify required gateway routes, typed fake upstream and trusted auth contracts while preserving the current deny/off runtime gates. |
| 03 | Added a pure fixture metadata diff/request preview: complete lock map, identity/source/target binding, scalar allowlist, no clears or collections, explicit safe replace mode; no network writes. Replaced the XML subset scanner with a bounded namespace-aware parser, added OPF3 title/series refinements, and detect ambiguity between adjacent OPF candidates and multiple EPUBs. | Real NAS sentinel and race-free reads, wider OPF/cover compatibility, Official target/readback and isolated mock contract coverage remain. |
| 04 | Existing local recovery code and its recorded mock scope identified. Invalid reconciliation observations now leave unknown jobs/outbox records quarantined; malformed dispatch outcomes cannot make a job retryable. | Reconcile every Sidecar, job, backup, restore and event requirement against source and rerun its applicable Linux tests. Real recovery remains Phase09. |
| 05 | Added ProseReader v36 binary digest from the same bytes as SHA-256; eight KOReader-generated size vectors and an upstream synthetic EPUB golden were checked. | Reconcile native/managed ownership, pairing and wire fixtures; live identity, revocation and reader compatibility remain unverified. |
| 06 | Added bounded EPUB ZIP/container/OPF/spine/XHTML reading and ProseReader XPointer/CFI conversion tied to a copied SHA-256 byte snapshot. On one pinned upstream synthetic EPUB oracle, 313 positions matched the DOM and roundtripped; 23 conservatively fell back to chapter only. Added fixture-based zero/one-based PDF page mapping. | Complete EXACT/CHAPTER_ONLY/UNRESOLVED evidence rules, wider real EPUB/DOM coverage, real PDF page-count parsing and reading-state contracts. DOM matches are not proof of actual cross-reader synchronization. |
| 07 | Existing plugin is an offline prototype. Offline personal validation and fixture persistence accept native KOReader XPointer strings; an isolated rating preview records the original 1–10 score with a declared round-up-to-1–5 rule and identity-bound fixture receipt. Session fixture replay no longer changes identity as the server clock advances and accepts compatible historical fixture receipts. | Implement and verify the requested KOReader plugin, authoritative rating/reset, shelf, personal-record and session contracts in isolated fixtures. Storing a native pointer is not a verified annotation CFI. A fixture receipt is caller-supplied, not authenticated proof, and cannot authorize writes. |
| 08 | PR #12 was merged into integration at `68b7d74`; its final PR head `ba593061` passed Phase08 CI run `41061715377`. The existing UI is offline and partial. | Complete the requested screens, diagnostics and update watcher; reconcile packaging and Phase09 test plan. |

## Current local verification

- `pnpm build`, `pnpm typecheck`, `pnpm lint`: passed after the initial Phase03/05/06 changes; Phase06 was typechecked and linted again after the PDF mapping change.
- `pnpm --filter @grimmlink/official-client test`: 27 passed with loopback access outside the sandbox; this is a mock server, not a live Official test.
- `pnpm --filter @grimmlink/identity test`: 19 passed after the binary digest work.
- `pnpm --filter @grimmlink/sync test`: 14 passed; the oracle test checks all 336 stored positions.
- `pnpm --filter @grimmlink/ingestion exec vitest run src/metadata-plan.test.ts`: 4 passed, including the missing-current-field guard.
- `python -m unittest discover -s scripts/phase-00 -p test_*.py`: 57 passed using the bundled Python and a workspace-local temporary directory.
- GitHub PR #13 CI for checkpoint `ded69d2998f3e9a140e07c5bd44b8418a947b317`: 11 jobs passed, including ARM64 image, pinned Spring registry, Phase00 and isolated mock suites. This predates the subsequent Phase03 parser and path changes.
- Phase03 parser, metadata-plan and sidecar pure tests: 9 passed; four additional path/scalar tests passed on Windows. Linux directory and symlink fixture cases require the Phase03 GitHub workflow on the new PR head.
- Phase04 reconciliation guards: 4 in-memory SQLite regression tests passed locally. Their changes are not covered by the earlier GitHub CI checkpoint.
- Phase07 offline personal contracts: 5 local tests passed, including native XPointer preservation and rating receipt mismatches; typecheck passed. The round-up rule is a preview choice, not verification of the live Official rating contract.
- Phase07 session replay: in-memory SQLite regression passed for current/legacy receipt retries, identity collision, original duration and revoked reader. The existing disk-backed suite cannot run on Windows because the private Unix directory mode check rejects the fixture; Linux CI is needed. Lua synthetic mock passed with local Lua.
- `pnpm exec prettier --check --end-of-line auto apps packages`: passed. The unmodified Windows checkout contains CRLF; `.gitattributes` now requests LF on future checkouts. The normal `pnpm format:check` previously failed on those checkout line endings.
- A full `pnpm test` on Windows failed: the NAS fixture reader is Linux-only, Windows symlink creation was denied, and loopback was unavailable inside the sandbox. The Official-client suite was separately rerun successfully outside it. WSL returned `REGDB_E_CLASSNOTREG` and Docker was unavailable; no Linux test pass is claimed.

The installed ProseReader library documents CSS, old pointer, entity and ruby
limitations. `DOM_ANCHOR_MATCH` means a local DOM anchor and roundtrip matched;
it is not promoted to production `EXACT` or a reader-device pass. The 23
fallbacks must remain visible until their causes are resolved or explicitly
accepted in the relevant scope.

`ACTIVE-SESSION.json` and the Phase08 handoff now record the observed PR #12
integration merge and PR-head CI; the offline gate checks that receipt while
continuing to enforce the disabled runtime flags. Read GitHub live before
relying on the recorded integration HEAD.
