# GRIMMLINK NEXT — GPT Web Session Handoff

**2026-10-28; PHASE 00 SOURCE_AUDITED_REVIEW_PENDING (NOT CONTRACT_LOCKED).** Not a release. `main` and `integration/grimmlink-next` intentionally untouched. Draft PR [#1](https://github.com/0xstillb/Grimmlink-Next/pull/1) from `feat/next-phase-00`.

## Mandatory next-session read order
1. Fetch **LIVE** GitHub branch HEAD/PR; current commit hash is intentionally NOT embedded in its own changed files.
2. Read [AGENTS.md](../../AGENTS.md), [ACTIVE-SESSION.json](ACTIVE-SESSION.json), [COMMIT-POLICY.md](COMMIT-POLICY.md), [CONTRACT.md](CONTRACT.md), [API-INVENTORY.md](API-INVENTORY.md), [DISCREPANCIES.md](DISCREPANCIES.md), [DECISIONS.md](DECISIONS.md), [UPSTREAM-MANIFEST.json](UPSTREAM-MANIFEST.json).
3. Read [Phase00 RESULT](phase-00/RESULT.md), [HANDOFF](phase-00/HANDOFF.json), [REVIEW](phase-00/REVIEW.md) and exact [Notion Phase00](https://app.notion.com/p/407c7efbc00981e2b08ff8fb45c3f846).
4. Inspect actual source at cited SHAs and PR diff, never guess deployed version or claim shell/E2E PASS.

## What is complete
- Source-only candidate audit: Grimmory Official v3.5.0 controller/DTO/service, Readest v0.12.16 KOSync/OPDS, GrimmLink Lua, old Python parity reference, Prose reader source.
- Comprehensive API Inventory, ADR and safety contract, version manifest separating installed UNKNOWN vs observed source, 15 issues, fixture plan, result/handoff.
- HIGH RISK: `PUT /api/v1/books/{bookId}/metadata` defaults `REPLACE_ALL`; explicitly supply `REPLACE_WHEN_PROVIDED` and false clearFlags. KOSync Official prefix `/api/koreader`, Readest appends `/users/auth` and `/syncs/progress`; no blind rewrite.
- No TypeScript runtime or source implementation; this is *documentation/source audit* exactly per Phase00. No unit, live endpoints, Hermes/NAS/physical tests.

## Gaps and blocking conditions
- Source routes verified **at source level only**; actual deployed version, permissions, DB/Flyway, exact auth payload and migration remain unverified.
- Independent reviewer must be a **fresh GPT Web context**; [REVIEW.md](phase-00/REVIEW.md) currently says PENDING and cannot be self-signed.
- P0 discrepancy register C-001..C-006 must be reviewed; safety switches before enabling live writes.
- Phase 00 gate remains REVIEW_PENDING, Phase 01 cannot be declared approved without separate review and actual contract lock.

## Exact next action
Open Draft PR #1 and do adversarial independent review (not implementation self-review), document defects `path:line`, create proper reviewed Phase00 gate only when source contract sufficiently locked. If issues, return to Phase00 branch and correct with reviewable commits. Do not merge `main`; integrated E2E only Phase09. Update Notion with **server-confirmed** commit SHA only after GitHub readback.

## Tests/commits
Audit performed by connected GitHub source reads and in-process JSON validation. Terminal runner **NOT_USED**. GitHub PR current HEAD and new commit are the authority; do not put self SHA here. Historical base `7d5bc8a421bcca29101453c6e46a2b4677363c51` only. No production data touched.

## Follow-up source check
Verified JWT source DTO shape, Bearer filter, nonempty collection replacement under REPLACE_WHEN_PROVIDED, and SidecarMetadataWriter direct Files.writeString path; see [API-INVENTORY.md](API-INVENTORY.md) and discrepancy **C-016**. No runtime tests. Review these paths before contract lock.
