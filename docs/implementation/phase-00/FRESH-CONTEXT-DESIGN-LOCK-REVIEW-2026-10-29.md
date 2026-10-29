# Phase 00 — Fresh-context independent contract review and design-lock decision

**Date:** 2026-10-29 (Asia/Bangkok)  
**Reviewed feature SHA (pre-review):** `f071229d9d9a1b7fb680cb68f83c763bc53138c6`  
**PR:** https://github.com/0xstillb/Grimmlink-Next/pull/2 (base `integration/grimmlink-next`, prior to closure write: OPEN/DRAFT/UNMERGED).  
**Review mode:** new GPT-6 ChatGPT conversation, independent of the earlier implementation conversation. This is a **fresh-context technical review**, **not a distinct GitHub human-account approval**. Historical CHANGES_REQUIRED reports are immutable; this report supersedes their *current design-only Phase00 disposition*, not their historical results.

## Verdict — PASS_PHASE00_DESIGN_ONLY (conditional on machine release-gate integrity)

Phase00's published Notion prompt explicitly scopes the phase to discovery, source contract, architecture, static/JSON evidence and an independent fresh-context review; executable gateway tests and all integrated E2E are **not Phase00 deliverables**. Given the completed pinned source-mechanism inventory at the reviewed SHA, the current **fail-closed documented design** may be locked to allow **Phase01 foundation work only**. **No runtime security PASS, gateway forwarding, production launch, enabled personal bridge, Native KOSync progress, OPF apply, reset, session writes, OPDS bypass, or permissions waiver is granted.**

This is a **contract/design acceptance**, NOT an application security authorization or an approval to merge to main/production. Actual Phase01 authorization is limited to local core/persistence/observability and must preserve all disabled-capability gates. Any new code that exposes Official routes must await the specific executable Phase02/05/07 security gates. If the repository requires an external human GitHub review separate from the fresh-context reviewer, that is an additional governance gate and is NOT satisfied here.

## Independent evidence inspected

- Actual [PR #2 changed-file inventory](https://github.com/0xstillb/Grimmlink-Next/pull/2/files): 93 files, including source audit, gate validator, tests and contracts; sampled relevant patches for the source-mechanism auditor, ADR-025, OPF policy, session outbox, release-gate workflow and integrity tests.
- Source pin [Grimmory `402e89b`](https://github.com/grimmory-tools/grimmory/tree/402e89b4452f8e2b17ab95f16c1621c003516cd2), source reads: `MetadataController.java` (unsafe default REPLACE_ALL), `BookMetadata.java` (actual DTO types), `KoreaderController.java` (global KOSync progress endpoints and unsafe registration log), `KoreaderService.java` (currentHash lookup with no visible per-book authorization in handler), `SecurityConfig.java` (ordered disjoint KO/Kobo/OPDS/JWT chains), `BookController.java` (books + personal reset surfaces).
- [Mechanism reconciliation](NEW-P0-01-SOURCE-MECHANISM-RECONCILIATION.md), [Gate status](PHASE00-GATE-STATUS.json), [403 source candidate chain](SOURCE-403-SECURITY-CHAIN-CANDIDATES.md), [43 priority auth dispositions](PHASE00-AUTHORIZATION-REVIEW-43-STATIC-DISPOSITION-2026-10-29.md), [R-01 scalar allowlist](OPF-SCALAR-FIELD-POLICY.md), [R-02 Native KOSync rejected ADR](../ADR-025-NATIVE-KOSYNC-SECURITY.md), [R-09 outbox](SESSION-OUTBOX-CONTRACT.md), [R-11 closure queue](PHASE00-CLOSURE-DECISION-2026-10-29.md).
- Exact HEAD GitHub Actions source audit [40853699147](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40853699147) SUCCESS, push [40853699022](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40853699022) SUCCESS, PR [40853706427](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40853706427) SUCCESS. These test only **pinned source/AST and static JSON/contracts**, not running Gateway or end-to-end security.
- Notion Phase00 implementation/reviewer prompt and Technical Spec v0.3 examined. Original reviewers' CHANGES_REQUIRED findings retained and compared with subsequent targeted corrections.

## Adjudication of open findings

| Finding | Phase00 design decision | Runtime restriction / mandatory owner |
| --- | --- | --- |
| NEW-P0-01 P0 | **SOURCE-INVENTORY ACCEPTED**: 923 Java sources SHA/AST, 715 source mechanism signals, 17 programmatic/type signals, 160 inherited flags, 65 repository interfaces, 348 handler records, 403 source route/verb candidates, 15 pinned source constants, no unowned route candidates under the current source gate. Not a Spring runtime census. | Phase02 must reconcile live `RequestMappingHandlerMapping`, filter-chain order, OPDS root wildcard, OPTIONS/HEAD, WebSocket/static/host/rewrite/bypass; **DENY every unverified route** |
| R-01 P0 | **DESIGN FIXED**: explicit 10-field typed sparse OPF scalar allowlist, no collections/clears, absent/null/blank omitted, `replaceMode=REPLACE_WHEN_PROVIDED`; target CAS and NAS/Sidecar side-effect safety not claimed. | `metadataApply=OFF` until Phase03/04 proves conflict/lock/side-effect safety |
| R-02 P0 | **FAIL-CLOSED DECISION ACCEPTED**: KO MD5 is not JWT, and a separate JWT GET precheck cannot atomically guard Official native progress. ADR-025 REJECTS native GET/PUT enablement. | `NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF` until new security design/ADR with atomic entitlement; Phase02/05 |
| R-02A / App P0 | **FAIL-CLOSED DESIGN ACCEPTED**: all user/library/book/file/row/list/reset/rating surfaces denied pending exact checks; batch mixed-ID must deny before any upstream call. | Phase02/07 ACL and direct-ingress/zero-upstream negative fixtures, all resets/personal bridges OFF |
| R-03–R-08 | **DOCUMENTARY CORRECTIONS ACCEPTED**: no duplicate progress writer, low-% manual status limitation, Sidecar global local-storage guard, CFI EXACT not guessed, Readest KO sync provisioning and currentHash mapping caveats. | Relevant Phase03–06 mocks, UX/E2E Phase09 |
| R-09 P1 | **DESIGN FIXED**: SQLite unique event, durable SEND_RESERVED commit, at-most-one network attempt, uncertain result/quarantine and no hidden retries; neither local id nor HTTP 202 proves remote exactly-once insertion. | `sessionsBridgeWrite=OFF` until Phase07 SQLite fault/ACK tests |
| R-10 P1 | **UNKNOWN DEPLOYED STATE DOCUMENTED**; no claim that real hardware versions match pins. | Phase09 audit, Hermes/NAS/readers integrated E2E |
| R-11 P1 | **HISTORY PRESERVED**: historic CHANGES_REQUIRED stands; this newer design-only review explicitly disambiguates lock from runtime authorization. | Update CURRENT handoff/PR/Notion with reviewed SHA and no misleading PASS of runtime |
| R-12 P1 | **DESIGN CORRECTED**: cover/metadata/file effects remain isolated and OFF. | Phase03/04/09 proof required |
| NEW-P0-02 KO logs | **RISK ACCEPTED AS BLOCKED DESIGN**, not accepted as safe runtime: pinned registration handler logs credentials, request logger may expose headers/bodies. | Phase02 deny `POST /api/koreader/users/create` before body forwarding, no direct upstream, redacted sink-capture tests; Phase05 identity |

## Strict release boundary

1. **Phase00 CONTRACT_LOCKED means design-only.** Mark Phase01 authorized *only* for TS core, database migration foundation and observability without enabled upstream HTTP or unreviewed sensitive routes.
2. **All 403 candidate routes remain `gatewayForwardDecision=DENY`**, including sensitive GET and WebSocket/static fallback. Unknown route/host/alias also DENY. Nothing is enabled at runtime by a documentation boolean.
3. **Runtime states stay `NOT_RUN`/`NOT_PROVEN`.** No deployed gateway, executed auth, log sink, SQLite crash test, real Official UI, hardware test or integrated E2E is asserted.
4. Source contract change, upstream version drift, new route source, change to security OFF values or new ADR invalidates this design-only approval and requires renewed independent review. Code may not use this report to bypass Phase02–09 gates.
5. The gate-only status/validator/CI mutation after the reviewed SHA must itself pass read-only CI, preserve the exact historical reviewer blob, and prove that fraudulent route ALLOW or tampered attestation fails closed. PR merge into integration remains separate from this review; production/main unchanged.

**Grade:** `PASS_PHASE00_DESIGN_ONLY` / static evidence B+ / runtime security **UNVERIFIED (not graded)**. No blanket SECURITY_PASS. 
