<!-- Current 2026-10-29 reviewer packet: [RE-REVIEW-PACKET.md](phase-00/RE-REVIEW-PACKET.md). Prior checkpoints below historical. -->
# GRIMMLINK NEXT — GPT Web Session Handoff

## NEW INDEPENDENT RE-REVIEW — 2026-10-29 (read first)

- [Re-review report](phase-00/RE-REVIEW-2026-10-29.md) evaluated original correction HEAD `411b68bd1ed2ffeca28165c55cc52fda6d88ea6c` and issued **CHANGES_REQUIRED**. Review documents R-01–R-12 and source evidence, not hardware/runtime PASS.
- Same session authored **subsequent** contract/gateway/metadata/Sidecar clarity fixes. Those new changes are **not independently re-reviewed**; new reviewer must inspect actual diff after `411b68` and assess the remaining design-level auth gate. **NOT CONTRACT_LOCKED, NO Phase01, no merge**; full integrated E2E Phase09 only. Fetch live HEAD.


## CURRENT CORRECTION CHECKPOINT — 2026-10-29 (supersedes earlier reviewed head below)

- **The source-contract correction pass R-01–R-12 is committed** on [Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2). Read [REMEDIATION.md](phase-00/REMEDIATION.md) alongside the prior [independent REVIEW.md](phase-00/REVIEW.md) and [HANDOFF.json](phase-00/HANDOFF.json).
- **Prior independent verdict remains CHANGES_REQUIRED**. Correction author cannot approve their own work: **independent re-review NOT_RUN, NOT CONTRACT_LOCKED, Phase01 NOT AUTHORIZED**. Read GitHub LIVE HEAD, do not use any older SHA in this file as branch tip.
- Important corrections: non-null empty bookReviews may clear despite safe replaceMode; BookAccessAspect only on annotated handlers, KOSync global hash requires book entitlement proof; Native file CFI write may be stale/null; manual READ can reset at low %; Sidecar writer has global isLocalStorage guard; EXACT CFI requires proven spine/text anchor.
- Proposed Fail-Closed feature switches are **not implemented or tested**. No user-facing production API/NAS changes. Terminal/build/unit/mock/live/Hermes/NAS/physical/E2E NOT_RUN; all full E2E Phase09.
- **Next:** fresh reviewer assesses correction diff and source links, records APPROVED/CHANGES_REQUIRED/BLOCKED as warranted. No PR merge or main edit.

## CURRENT VERIFIED GATE — 2026-10-29 (supersedes all historical snapshots below)

- **Phase 00 independent review: CHANGES_REQUIRED. NOT APPROVED, NOT CONTRACT_LOCKED, PHASE 01 NOT AUTHORIZED.**
- Active [Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2) on `feat/next-phase-00`. Reviewed original head: `5eccac25c8e85e16cfa913b72ae36bc6a3ceeed8`; **fetch the live head for the latest review/handoff commit SHA**.
- Historical [PR #1](https://github.com/0xstillb/Grimmlink-Next/pull/1) merged to `integration/grimmlink-next` only at `5470c7ad807cb701381ae8bcd9abe516f351b150` **without independent gate**. `main` not modified by this review.
- **Read [Independent REVIEW.md](phase-00/REVIEW.md) first**, then [HANDOFF.json](phase-00/HANDOFF.json) and source-linked discrepancies C-001..C-021. Reviewer issues **R-01..R-12** include metadata collections, per-user ACL (including KOSync/rating/status), native KOSync double-write, manual read status, global Sidecar guard, CFI EXACTness, and obsolete handoff headers.
- **Next action:** Correct Phase00 source contract/fixtures/ACL gaps on feature branch, add evidence and request fresh independent re-review. Unsafe metadata, managed CFI/progress, unverified cross-user bridge and NAS file mutation remain disabled. Do **not** merge PR #2 or commence Phase01 without subsequent evidenced gate.
- **Executed:** read-only source/tag/PR/Notion inspection and GitHub documentation commits. **NOT_RUN:** shell/build/unit/mock/live API/Hermes/NAS/real readers; full E2E strictly Phase09. Source tag is **not** deployed version.

## Historical implementer checkpoint notes — superseded where conflicting

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


## 2026-10-29 — Targeted source recheck checkpoint (implementer)

Following a live HEAD check at prior commit `7a3647a6aff08c7d0868fc976646e09a31eb7665`, reviewed Grimmory Official v3.5.0 metadata merge, Native KOSync and personal service source. Added [SOURCE-RECHECK-2026-10-29.md](phase-00/SOURCE-RECHECK-2026-10-29.md), new discrepancies C-017..C-021, guardrail and fixture clarifications. **Phase remains SOURCE_AUDITED_REVIEW_PENDING, not CONTRACT_LOCKED.** This continuation is not a fresh independent review; `REVIEW.md` verdict remains PENDING. Unit/terminal/live API/physical E2E NOT_RUN. Production and integration/main untouched.

**Next:** obtain genuinely separate reviewer review of entire PR and new findings; after documented corrections and approval, user-controlled integration PR gate. Do not start Phase01 or pretend that installed Grimmory/DB/NAS status is known. Retrieve current live HEAD rather than trusting this checkpoint.


## 2026-10-29 PR continuity correction

GitHub live check found [PR #1](https://github.com/0xstillb/Grimmlink-Next/pull/1) **merged into non-production integration** on 2026-10-28 17:02:39Z at merge SHA `5470c7ad807cb701381ae8bcd9abe516f351b150`. That merge did **not** supply the required independent-review evidence or approve Phase01. The subsequent recheck commit `a5eb72d4b0f8e01f876fb20c8895813df33c8ddb` is proposed separately through **[Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2)**, still review-pending. `main` remains untouched. Use PR #2 for current Phase00 improvements, PR #1 as historical audit foundation. Continue to read live heads before any mutation.
