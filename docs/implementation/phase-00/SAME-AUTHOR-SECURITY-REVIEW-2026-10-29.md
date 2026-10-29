# Phase00 — Owner-requested review of source/design gate (2026-10-29)

**Reviewer role: Same ChatGPT conversation that authored commit 7dda37c and workflow fix 0a6d74b. NOT INDEPENDENT. This is not a substitute for independent approval.**

- Reviewed immutable target: `0a6d74b5a43c656045c009f38a9e77ea85dde1bf`; [Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2), base `integration/grimmlink-next`. Reporting commit is necessarily later than target.
- Historic independently authored reports are preserved unchanged: [FRESH-INDEPENDENT-SECURITY-REVIEW-2026-10-29.md](FRESH-INDEPENDENT-SECURITY-REVIEW-2026-10-29.md) at blob `085c8bedb16513df38575fcff2a432ab72de2ad8` and [FINAL-INDEPENDENT-REVIEW-2026-10-29.md](FINAL-INDEPENDENT-REVIEW-2026-10-29.md).
- Input: user requested this implementation author to perform the review and close the gate. That is permission to assess and fix, **not evidence that the mandatory independent reviewer existed or that unresolved acceptance criteria are satisfied**.

## Evidence assessed

1. [CI 40845407633](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40845407633), [read-only push 40845407732](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40845407732), [read-only PR 40845414767](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40845414767): all SUCCESS on reviewed SHA `0a6d74b5a43c656045c009f38a9e77ea85dde1bf`; scope includes unit/static/gate integrity only.
2. [Pinned source census](JAVA-SOURCE-WIDE-CENSUS.json) 923/923 Java blob SHA + AST; 15 symbolic constants; 348 method annotations / 403 source route/verb variants, 346 unique method names due to two overloads; [candidate matcher matrix](SOURCE-403-SECURITY-CHAIN-CANDIDATES.md) all forwarding DENY; one `/api/v1/opds` root matcher ambiguity unresolved.
3. [AUTH-43 evidence](AUTH-43-REVIEW-DISPOSITION.md) 43/43 priority mutation handlers source reviewed, 0 authorized, **348/348 are source-ledger-deny, not 348 independently reviewed authorization proofs**. This report corrects misleading `phase00SourceAuthorizationReviewComplete` in machine gate receipt to false and distinguishes 43/43 priority complete.
4. [OPF typed scalar policy](OPF-SCALAR-FIELD-POLICY.md) and [ADR-025 KOSync](../ADR-025-NATIVE-KOSYNC-SECURITY.md) explicitly refuse unsafe activation. [Session outbox](SESSION-OUTBOX-CONTRACT.md) keeps `UNCERTAIN`, one network attempt, no exactly-once claim, write OFF.
5. [App ACL source matrix](APP-AUTHORIZATION-MATRIX.md) shows assigned-library and own-row checks, not current content+file entitlement. [Gateway owner matrix](SECURITY-ROUTE-OWNERSHIP.md) requires whole-batch deny and no direct Official exposure; all are **design-only**, not deployed.

## Finding dispositions for this review

| Finding | Disposition | Evidence / remaining Gate |
| --- | --- | --- |
| NEW-P0-01 P0 | **CHANGES_REQUIRED** | Source 923 SHA+AST does not prove type-bound registered Spring mappings; `sourceAnnotationComplete=false`, 160 inherited/interface flags only lexical triage. Contract acceptance currently requires complete *source route mechanism and ownership* census. Need a separate reviewer acceptance of explicit Phase02 deferral **or** finish Phase00 source-semantic proof, plus exact Spring runtime tests before enabling any route. |
| R-02A P0 | **DESIGN_CONTAINED, RUNTIME_OFF** | All reset types/rating deny whole batch as in [Security matrix](SECURITY-ROUTE-OWNERSHIP.md); non-atomic ACL and direct ingress still unproven. Phase02/07. |
| R-01 P0 | **DESIGN_CONTAINED, RUNTIME_OFF** | 10 typed OPF scalar candidates; no collection/review clear or field lock bypass; CAS and Sidecar/NAS checks Phase03/04, metadataApply OFF. |
| R-02 P0 | **DESIGN_CONTAINED, RUNTIME_OFF** | KO MD5 != JWT; global hash/native progress has unclosed atomic book-entitlement TOCTOU; ADR-025 forbids GET/PUT and alternate admin writer until independently re-decided. Phase02/05/07. |
| R-09 P1 | **DESIGN_CONTAINED, RUNTIME_OFF** | At-most-one durable outbox dispatch, UNCERTAIN after lost ACK/202, no automatic resend. Actual SQLite/crash tests Phase07. |
| R-11 P1 | **FOLLOWUP_REQUIRED** | Active status accurately blocked, but historical `CURRENT` sections in multiple documents require explicit superseded signposts; Notion's latest top checkpoint is blocked. No independent approval. |
| NEW-P0-02 / KO logging | **SOURCE_RISK / RUNTIME_OFF** | Pinned KO registration handler logs submitted map and generic logger lacks KO credential exclusion; block request before Official and verify log-sink Phase02/05. |
| Kobo mutable token, child book-file, MagicShelf public, Kobo body/path, setup race | **SOURCE_RISK / RUNTIME_OFF** | 43-handler source receipt flags issues; Phase02/07 must supply executable route-specific denials and negative tests. |
| Independent reviewer approval | **NOT_SATISFIED** | Same implementer cannot attest independent PASS; no approved GitHub PR review by a distinct reviewer; historical independent CHANGES_REQUIRED. |

## Decision: CHANGES_REQUIRED — PHASE00 NOT CONTRACT_LOCKED

A passing source CI validates **evidence integrity**, not authorization. There is no effective Gateway implementation, no verified network isolation or current user/book/content ACL, no tested Spring mapping semantics; all real network/Gateway/SQLite/Hermes/NAS/reader E2E are NOT_RUN. Phase09 exclusively owns the full real integrated E2E.

The safest Phase00 closure path is a **separate independent reviewer** assessing whether the documented fail-closed architecture satisfies the ORIGINAL design-only acceptance criteria with Phase02/05/07 executable gates. If not, reviewer must identify exact Phase00 source semantic gaps. Never silently downgrade the requirement to pass. The operator could request a **separate explicit written policy exception** for independent sign-off; this message is not recorded as such an exception, and it would not establish missing source/runtime proof.

**Result:** `CHANGES_REQUIRED` (same-author review, NOT independent), `phase00ContractLocked=false`, `phase01Authorized=false`, PR #2 Draft/unmerged. No release, no merge, no Phase01 authorization, no sensitive feature enabled.
