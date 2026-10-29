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

# Phase 00 — Start Here

## HISTORICAL — 2026-10-29 Implementer Final Remediation (RE-REVIEW REQUIRED)

**Implementation-document checkpoint:** `IMPLEMENTER_FINAL_REMEDIATION_COMMITTED_AWAITING_FRESH_INDEPENDENT_REVIEW`. This is **not** reviewer approval. Last actual independent verdict [FINAL-INDEPENDENT-REVIEW-2026-10-29.md](FINAL-INDEPENDENT-REVIEW-2026-10-29.md) = **CHANGES_REQUIRED / NOT_APPROVED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** (8 DOC_FIXED / 4 DOC_PARTIAL on cea6485). See [FINAL-REMEDIATION-2026-10-29.md](FINAL-REMEDIATION-2026-10-29.md). Fetch live GitHub HEAD (prior starting SHA `f263e6208d9dc520e29e3113dcf6bd632f239b72`), do not embed self SHA. PR #1 merged into integration in history; PR #2 remains Draft. R-02 KOSync progress **BLOCKED/OFF** due to non-atomic no-fork ACL proof, other metadata/personal/session writes OFF. All real integrated E2E Phase09 only; no Phase01 or merge.


**Current 2026-10-29:** SOURCE_AUDITED, post-review correction recorded; **independent CHANGES_REQUIRED remains, NOT CONTRACT_LOCKED**. The bootstrap instructions below are historical.

## Official instructions

- [PHASE 00 implementation/reviewer prompts](https://app.notion.com/p/407c7efbc00981e2b08ff8fb45c3f846)
- [Master Playbook](https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0)
- [Technical Spec](https://app.notion.com/p/407c7efbc00981f1a9c6ccb0de5d6a54)
- [Upgrade Runbook](https://app.notion.com/p/407c7efbc0098105b492d0a7cca31bff)

## First actions

1. Inspect source repos and latest stable releases as well as the **actually deployed** Grimmory version if access is provided. Do not assume upstream `develop` equals installed tag.
2. Verify Official Metadata, Cover, OPDS, KOSync, Personal Data APIs, auth and NETWORK disk behavior.
3. Fill [API-INVENTORY.md](../API-INVENTORY.md), [UPSTREAM-MANIFEST.json](../UPSTREAM-MANIFEST.json), and resolve or register blockers.
4. Freeze contracts, package layout, security/data ownership, single-port Gateway route map, intended deployment.
5. Write `phase-00/RESULT.md`, `HANDOFF.json`, `REVIEW.md` **only after actual work** with real source references, git SHA and command results.
6. Use an independent reviewer with the Reviewer Prompt. Phase exits only after a review-backed contract lock.

**Tests for Phase 00:** Static/source verification and JSON validation only. No real NAS, Hermes, readers, production mutation or full E2E. Phase 09 exclusively handles integrated E2E.


## Mandatory next session after correction

Fetch LIVE [Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2); read [Independent REVIEW.md](REVIEW.md), [Implementer REMEDIATION.md](REMEDIATION.md), Contract/Discrepancies/Handoff. Request **fresh independent re-review** of correction diff and unresolved security/metadata contracts. Do not merge PR, change main or begin Phase01; Full E2E/Hermes/NAS/physical readers Phase09 only.

**Next reviewer:** Read [RE-REVIEW-PACKET.md](RE-REVIEW-PACKET.md) for the specific R-01–R-12 acceptance matrix and copyable fresh-session prompt. A packet does not equal independent review.
