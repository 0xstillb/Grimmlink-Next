## CURRENT — Phase00 Final Security Correction Checkpoint (2026-10-29; implementer, not independent approval)

Start `1370f9f38482af1442a3ecd7570e7dbbc4ac3bdd` (independent report commit); independently reviewed immutable HEAD `9682f9ce9305ea5242af82418bec7e504bf1ca03` is distinct; fixture/security-design correction commit `496681b307dd71fefedb649d951079557dc431f9`. **97 synthetic fixture definitions (70 original + 27 added, 11 modified); all execution NOT_RUN**. See [final correction report](FINAL-SECURITY-CORRECTION-2026-10-29.md), [KO contract](KO-CREDENTIAL-GATEWAY-CONTRACT.md), [App ACL](APP-AUTHORIZATION-MATRIX.md), [Phase acceptance](CONTRACT-LOCK-ACCEPTANCE-CRITERIA.md). **NEW-P0-01 remains P0 BLOCKER**: 923 Java files in pinned tree but only 64 named controllers/348 annotations previously read, full remaining source-wide audit not completed; runtime Spring routes NOT_RUN. NO SOURCE_ANNOTATION_COMPLETE claim. KO logging mitigations are DESIGN_SPECIFIED, not deployed; metadata/session post-send fixtures now use UNKNOWN remote mutation. Native KO progress, metadataApply, personal bridges, resets and session writes BLOCKED/OFF (design-only). **Independent verdict remains CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** PR #2 Draft / do not merge; full E2E Phase09 only.

---

## CURRENT — 2026-10-29 Complete App Route & Security Contract Correction (implementer; pending independent review)

**Branch pre-correction HEAD:** `9eb7790367d2272e430ee78d2323952960234c00`; subsequent commits must be checked LIVE on [Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2). Prior independent verdict **CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** remains authoritative. **Recognized controller file census 64/348 method-level annotations** (56/321 root + 8/27 App; source annotation completeness across all Java and runtime mappings UNVERIFIED). [App census](ROUTE-CENSUS-APP.md) · [Mapping expansion](ROUTE-MAPPING-EXPANSION.md) · [Route ownership](SECURITY-ROUTE-OWNERSHIP.md) · [Correction report](ROUTE-COVERAGE-SECURITY-CORRECTION-2026-10-29.md) · [Reviewer packet](NEXT-INDEPENDENT-REVIEW-PACKET.md).

**Feature gates (DESIGN_SPECIFIED, not runtime OFF switches):** `NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF`, metadata apply OFF, reset-progress/rating OFF, personal bridge reads/writes OFF, sessions bridge OFF. No atomic native KOSync ACL proof; Gateway precheck is not atomic; no zero-lost-update proof for Official metadata REST; session 202 is not immutable idempotent receipt. Runtime, unit/mocks, gateway, network and E2E NOT_RUN. Phase09 only full E2E/Hermes/NAS/devices. Do not merge PR #2, approve Phase01, or mark new findings independently APPROVED.

---

## Latest Phase00 Security Remediation — 2026-10-29 (NOT independent approval)

**R-02A NEW P0:** Official `POST /api/v1/books/reset-progress` (BOOKLORE/KOREADER/KOBO) and `POST /api/v1/books/reset-personal-rating` require deny-before-upstream gateway coverage, current assigned-library/content eligibility for EVERY book ID, own-record eligibility and all-or-nothing mixed-batch rejection. Other sensitive routes include viewer-setting, shelves, notes v1/v2, PDF annotations, session reads/writes and KO profile. **56 source Controller files / 321 method-level annotations** inspected; runtime Spring mapping/aliases NOT_RUN. No generic sensitive fallback. **NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF**: precheck TOCTOU not atomic. `metadataApply=OFF`, `personalBridgeWrites=OFF`, `sessionsBridgeWrite=OFF`; design != executable enforcement. Historical **CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** unchanged; no merge or Phase01. Correction baseline `59773bd65eb265dbe4850204a65649b7c8a5c51c`, read LIVE HEAD for new commits.

[Security remediation](SECURITY-REMEDIATION-2026-10-29.md) · [Full annotation census](ROUTE-CENSUS-INDEX.md) · [ADR-025](../ADR-025-NATIVE-KOSYNC-SECURITY.md)

# Phase 00 — Source Audit Result (implementer)

## HISTORICAL — 2026-10-29 Implementer Final Remediation (RE-REVIEW REQUIRED)

**Implementation-document checkpoint:** `IMPLEMENTER_FINAL_REMEDIATION_COMMITTED_AWAITING_FRESH_INDEPENDENT_REVIEW`. This is **not** reviewer approval. Last actual independent verdict [FINAL-INDEPENDENT-REVIEW-2026-10-29.md](FINAL-INDEPENDENT-REVIEW-2026-10-29.md) = **CHANGES_REQUIRED / NOT_APPROVED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** (8 DOC_FIXED / 4 DOC_PARTIAL on cea6485). See [FINAL-REMEDIATION-2026-10-29.md](FINAL-REMEDIATION-2026-10-29.md). Fetch live GitHub HEAD (prior starting SHA `f263e6208d9dc520e29e3113dcf6bd632f239b72`), do not embed self SHA. PR #1 merged into integration in history; PR #2 remains Draft. R-02 KOSync progress **BLOCKED/OFF** due to non-atomic no-fork ACL proof, other metadata/personal/session writes OFF. All real integrated E2E Phase09 only; no Phase01 or merge.


**Current 2026-10-29: IMPLEMENTER_CORRECTION_RE_REVIEW_PENDING; previous independent CHANGES_REQUIRED, NOT CONTRACT_LOCKED.** Historical source audit follows. This file is a record of source and architecture investigation, not a final gate. The authoring session did not access user's Hermes/NAS, tokens, clients or execute shell tests.

## Completed
- Read actual GitHub repository and Draft PR #1; pre-audit HEAD `7d5bc8a421bcca29101453c6e46a2b4677363c51`; main and integration both `59ffeee432dadf40f61005f7d605be9bfe82df48`.
- Read pinned Grimmory Official v3.5.0 routes/DTOs and service behavior, Readest v0.12.16 KOSync/OPDS client, Prose source exports/signatures, GrimmLink Lua and legacy Python adapter reference; confirmed release ref SHAs in manifest.
- Replaced bootstrap-only architecture/API inventory with source-evidenced design candidate, manifest, 15 discrepancy gates and fixture plan. Audited source links in each relevant doc.
- Critical finding: `REPLACE_ALL` is server default, **not safe**; `REPLACE_WHEN_PROVIDED` query + explicit clearFlags required. Official KOSync prefix is `/api/koreader`; Readest builds URLs by appending unprefixed KOSync paths.
- Explicitly recorded unknown installed versions, unknown production API/DB/NAS state, auth ownership and non-idempotent session risk.

## Files in audit checkpoint
- `docs/implementation/CONTRACT.md`, `DECISIONS.md`, `API-INVENTORY.md`, `UPSTREAM-MANIFEST.json`, `DISCREPANCIES.md`, `phase-00/FIXTURE-PLAN.md`, `phase-00/RESULT.md`, plus updated `ACTIVE-SESSION.json`, `SESSION-HANDOFF.md` and placeholder `phase-00/HANDOFF.json` / `REVIEW.md`.

## Historical bootstrap validation / remaining (superseded by the current 2026-10-29 banner)
- Source inspection through connected GitHub; structured manifest and handoff checked with JS `JSON.parse` before commit; GitHub server readback to verify commit.
- Terminal, JVM compile, TypeScript build, unit, live API probes, real NAS and E2E: **NOT_RUN**. No actual deployment claim. All real integrated tests deferred to Phase09.
- At this **historical bootstrap checkpoint**, independent review was PENDING. Superseded by the 2026-10-29 independent CHANGES_REQUIRED review and subsequent re-review; never read this as current status.
- Need resolve P0 `C-001..C-006` and at least freeze auth/field details before starting affected Phase01/02 implementation; source target version is candidate, not installed.
- **Historical next action, superseded:** reviewer of Draft PR #1. The current source of truth is live Draft PR #2 and the latest independent re-review/hand-off, not this old instruction.

**Commit SHA note:** Current commit cannot contain its own final SHA. Fetch live branch HEAD / PR server-side. Never substitute this pre-audit SHA as result commit SHA.

## Source follow-up before review (same day)
Additional controller/DTO inspection pinned JWT login/refresh request and response shapes, verified `Authorization: Bearer` filter, identified nonempty OPF collection replace semantics, and inspected Sidecar writer's direct adjacent-file write. See new C-016. Still no runtime/physical test or independent approval.


## 2026-10-29 supplementary source recheck (implementer; not independent)

A follow-up read-only source audit of the pinned Grimmory v3.5.0 release identified new risks **C-017..C-021** and updated the architecture/contract/checkpoint. Details and source links: [SOURCE-RECHECK-2026-10-29.md](SOURCE-RECHECK-2026-10-29.md). In particular, the single-book metadata `mergeCategories` flag also governs authors/reviews; native KOSync already writes file progress/optional CFI and can reset low-% read status; personal record user ownership is distinguishable from per-library book authorization. These are source-level findings, not a tested compatibility claim. The distinct independent reviewer remains PENDING. No runtime/unit/device tests or production changes.


## 2026-10-29 PR continuity correction

GitHub live check found [PR #1](https://github.com/0xstillb/Grimmlink-Next/pull/1) **merged into non-production integration** on 2026-10-28 17:02:39Z at merge SHA `5470c7ad807cb701381ae8bcd9abe516f351b150`. That merge did **not** supply the required independent-review evidence or approve Phase01. The subsequent recheck commit `a5eb72d4b0f8e01f876fb20c8895813df33c8ddb` is proposed separately through **[Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2)**, still review-pending. `main` remains untouched. Use PR #2 for current Phase00 improvements, PR #1 as historical audit foundation. Continue to read live heads before any mutation.


## 2026-10-29 implementation correction checkpoint

Corrected R-01–R-12 source-contract descriptions; added [REMEDIATION.md](REMEDIATION.md), explicit metadata reviews/lock field masking, Native/per-library ACL distinction, no second CFI writer, manual status threshold fixture, Sidecar global guard, exactness and source-vs-installed versions. **This is documentation-only, no Adapter code, no compiled unit, no mocked fixtures, no live API or real device testing.** Shell/build/unit/mock/live/NAS/Hermes/physical/E2E NOT_RUN. Existing Independent REVIEW.md is **CHANGES_REQUIRED** until separate new reviewer validates this diff. No merge or Phase01.
