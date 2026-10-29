# Phase 00 — Start Here

## CURRENT — 2026-10-29 Implementer Final Remediation (RE-REVIEW REQUIRED)

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
