## CURRENT — PHASE05 OFFLINE DEVELOPMENT CHECKS PASSED AT SOURCE HEAD (2026-10-30)

[Draft PR #9](https://github.com/0xstillb/Grimmlink-Next/pull/9) on `feat/next-phase-05` targets merged Phase04 integration `fe83f22f`. Code SHA `8ec70e67` passed [Phase05 isolated CI #41016950913](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41016950913) and [Phase00 #41016950807](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41016950807), [Gateway #41016950889](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41016950889) and [Phase04 #41016950802](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41016950802). Latest doc commit needs its own CI verification. Status `DEV_CHECKS_PASS_WITH_DEFERRED_RISKS` means isolated byte-identity, KO filename-mode MD5, paired-device hash/revoke, durable mock KOSync/CAS and mock HTTP passed source checks; **not** full `SYNC_CODE_REVIEWED`, Official approval or physical E2E. KO partial MD5 helper/golden EPUB and Official Native/Managed owner ACL remain unverified and OFF. One independent security review + fixes and physical E2E remain Phase09, no new RBAC, main untouched.

---

## ACTIVE — PHASE05 OFFLINE CODE + DRAFT PR #9 (2026-10-30)

From [Phase04 merged PR #8](https://github.com/0xstillb/Grimmlink-Next/pull/8) integration commit `fe83f22f`, new [Draft PR #9](https://github.com/0xstillb/Grimmlink-Next/pull/9) on `feat/next-phase-05` targets `integration/grimmlink-next`, **not main**. Current state **CODE_IMPLEMENTED_CI_PENDING**, not code review/CI approval. All Phase05 new HTTP factories unmounted. Offline SHA-256 byte evidence, KO hash ambiguity rejection, one canonical owner + multiple individually revocable token-hashed devices, persisted MOCK_MANAGED-only writer revisions, conflict/idempotent event receipts and strict mock wire tests are committed. Native Official KOSync progress is **still disabled** due atomic ACL/TOCTOU risk; no guessed partial MD5, no real account identity, no physical devices or E2E. One independent review plus fixes deferred to Phase09.

Latest evidence: [Phase05 RESULT](phase-05/RESULT.md) · [HANDOFF](phase-05/HANDOFF.json) · [Phase05 CI workflow](../../.github/workflows/phase05-offline.yml). **Read live GitHub exact-head CI before assigning PASS**; no local terminal runner has run the workspace suite. Official forwarding DENY_ALL, protected writes OFF, production NOT_AUTHORIZED, multiple readers same owner, no new RBAC.

---

## ACTIVE — PHASE04 CLOSURE AND OWNER-AUTHORIZED INTEGRATION MERGE (2026-10-30)

[Draft PR #8](https://github.com/0xstillb/Grimmlink-Next/pull/8) on `feat/next-phase-04` now includes offline Sidecar, verified local metadata-only backup JSON, fake Official preview/explicit confirm/CAS/readback, bounded durable SQLite jobs, exclusive book locks, step receipts, local outbox UNKNOWN quarantine and owner/CSRF gated read-only/confirm route factories. Routes remain **UNMOUNTED** in production Adapter. User authorized integration merge after full exact-head CI. Final CI evidence must match HEAD; do not inherit earlier green results.

**NO live exposure:** Official forwarding DENY_ALL, metadataApply/NAS write OFF, production NOT AUTHORIZED, physical Hermes/NAS/readers E2E and consolidated independent security review Phase09. Merge to `integration/grimmlink-next` only; main untouched. [RESULT](phase-04/RESULT.md), [HANDOFF](phase-04/HANDOFF.json), [Risk ledger](DEFERRED-SECURITY-LEDGER.md).

---

## CURRENT — PHASE04 OFFLINE DEVELOPMENT CHECKPOINT (2026-10-30)

**Branch:** `feat/next-phase-04` from merged Phase03 integration `9a9ae6e0`. **Draft [PR #8](https://github.com/0xstillb/Grimmlink-Next/pull/8)** targets `integration/grimmlink-next`, not `main`. **Status:** `DEV_CHECKS_PASS_WITH_DEFERRED_RISKS` for isolated offline development. Operational enablement remains BLOCKED; this is not a security review.

**Implemented locally:** sparse Sidecar JSON preview, OPF-first optional fallback, manual import preview-only; private checksum-verified metadata JSON backup (NOT full Official backup) and restore preview (NO Official apply); durable SQLite job leases/events, idempotency, explicit retry, failed/unknown reconciliation (never auto-resend UNKNOWN); fake-owner-only GET + finite SSE replay factory, not registered in live Adapter.

**Evidence:** Phase04 [CI #41011895509](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41011895509) **SUCCESS**, Phase00 integrity [#41011895521](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41011895521) **SUCCESS DESIGN-ONLY**, Phase02 mock Gateway [#41011895512](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41011895512) **SUCCESS**, all at verified pre-documentation head `41f328d2b81f2ac36f79f0367594e50c5b7d42f2` (clean source, no temporary formatter). Later documentation commits and other CI must be checked at their own HEAD. No Hermes/NAS/reader/Official real execution. One final independent security review and remediation Phase09.

**Safety:** all gateway candidates `DENY_ALL`, `metadataApply=OFF`, NAS writes OFF, restore application OFF, production `NOT_AUTHORIZED`. Single owner; no RBAC. Historical sections below describe earlier stages and are retained for audit.

---

## CURRENT PHASE02 DEVELOPMENT HANDOFF — 2026-10-30

**Active phase:** 02 — `DEV_CHECKS_PASS_WITH_DEFERRED_RISKS` (development-only), `BLOCKED_OPERATIONAL_ENABLEMENT` (live/production). [PR #6](https://github.com/0xstillb/Grimmlink-Next/pull/6) stays Draft/Unmerged. See [Phase02 RESULT](phase-02/RESULT.md), [Handoff](phase-02/HANDOFF.json) and [risk ledger](DEFERRED-SECURITY-LEDGER.md).

The Phase02 mock-only gateway, auth contracts, local version/capability endpoints, isolated Spring registry evidence, unit/mock/CI tests and handoff are delivered. Last fully verified pre-manifest HEAD `e34038b`: four relevant GitHub workflows SUCCESS. Version endpoint change `3ce5a5f` and this documentation/gate migration require fresh exact-HEAD checks; do not claim green prematurely. Phase00 source checker now accepts the Phase02 checkpoint **only while preserving historical Phase01 attestation and all fail-closed safety states**.

One owner / one Official Grimmory account / multiple readers. No new multi-user RBAC. All upstream forwarding `DENY_ALL`, sensitive writes OFF, no merged/deployed gateway, real Hermes/NAS/reader E2E and one final independent security review in Phase09. Next: Phase03 safe offline/fixture implementation after verifying current HEAD checks.

---

## CURRENT PROJECT POLICY — 2026-10-30 (supersedes prospective process requirements below)

**Single-Owner Private Mode:** one human owner / one Grimmory Official account, multiple paired reader devices; do not implement new multi-tenant GrimmLink RBAC or per-user book ACL. Canonical [delivery policy](SINGLE-OWNER-POLICY.md), [Phase 00–09 matrix](PHASE-MATRIX.md), [deferred security ledger](DEFERRED-SECURITY-LEDGER.md).

**Mandatory independent security review REMOVED as a gate in Phases 00–08; one consolidated independent review and remediation before Phase09 production.** Advance development after real CI and handoff, record unresolved risks. This override does not revise historical evidence or independently reviewed HEADs, does not permit unsafe Live Official forwarding, unauthenticated writes, public ingress or deployment. Keep `DENY_ALL` and OFF capabilities until relevant safe runtime implementation; full Hermes/NAS/reader E2E is Phase09 only. No unapproved merges.

---

## CURRENT — Pinned real Spring runtime captured; real ACL/ingress still blocked (2026-10-29)

**Actual Spring startup evidence:** [CI #40918459916](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40918459916) SUCCESS at exact implementation source `30b7d22c2297d2e022dd68538c4fc26072606080`, pinned Grimmory `402e89b4452f8e2b17ab95f16c1621c003516cd2`, isolated Java25 + H2. `RequestMappingHandlerMapping` reported **352** runtime handlers, `FilterChainProxy` exposed **12 ordered filter chains**; **346 distinct source handler identities** from the 403 source route candidate ledger were found in runtime. [Runtime artifact #12918045157](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40918459916#artifacts) includes mapping/filter registry, pinned runtime OpenAPI and handler-level reconciliation. **This proves boot-time mappings/chains exist, NOT effective authorization per HTTP method/path, content rights, live identity, device pairing or safe upstream forwarding.**

**Other code:** pinned-source runtime probe and reconciler, user-bound HMAC Admin/Reader session crypto (OFF/not wired), bounded loopback-only HTTP transport (not exported/wired), injected mock Official client, pure Admin CSRF/Owner ACL, one-port Caddy mock and negative HTTP/credential log tests. [Phase02 Gateway CI #40919435611](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40919435611) SUCCESS at code source `add509230058d2d033690445b0cd733fa744a141`. [Phase00 integrity #40919435185](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40919435185) SUCCESS design-only at same source. Future docs HEAD must pass separate exact-HEAD checks.

**Security verdict:** `SPRING_RUNTIME_METADATA_CAPTURED / GATEWAY_CODE_REVIEWED_NOT_GRANTED`. `RUNTIME-SECURITY-EVIDENCE.json` now truthfully records partial real proof with CI provenance; `runtime_security_gate.py` still blocks forged APPROVED state and requires independent current per-user/library/book/file/row rights + actual ingress/TLS/device session runtime authorization and separate fresh-context review. All Official forwarding `DENY_ALL`, sensitive bridges OFF, production NOT_AUTHORIZED, full E2E Phase09. [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4). PR #6 DRAFT/UNMERGED.

---

## CURRENT — Phase02 one-port mock code + runtime HOLD gates (2026-10-29)

[Draft PR #6](https://github.com/0xstillb/Grimmlink-Next/pull/6) contains isolated Caddy on host-loopback :6060, Adapter nonpublished :6061 within same network namespace, typed mock REST GET, admin/reader pure policy, all-or-none synthetic book/file/record rights and an anti-forgery runtime proof gate. [Last full mock CI SUCCESS #40905567097](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40905567097) at source `150bd87f`; latest extended canary and docs commits require exact-head CI confirmation. [Phase02 RESULT](phase-02/RESULT.md), [HANDOFF](phase-02/HANDOFF.json), [independent reviewer packet](phase-02/INDEPENDENT-REVIEW-REQUEST.md).

**Not approved:** Official proxy/UI/OPDS/KO/Kobo/Komga forwarding, live session/atomic rights, external TLS/SNI/direct ingress and outbound network egress, real Spring runtime route/chain evidence, fresh independent review and integration merge. `DENY_ALL`, all sensitive OFF and full Phase09 E2E deferred. Docker bridge mock does NOT prove upstream network isolation. Keep PR DRAFT and do not promote `GATEWAY_CODE_REVIEWED`.

---

## ACTIVE Phase02 follow-up — mock-only Official client and Admin/Reader policy (2026-10-29)

[Draft PR #6](https://github.com/0xstillb/Grimmlink-Next/pull/6) remains **OPEN / DRAFT / UNMERGED**. The feature branch adds a typed injected fake-only Official GET client, bounded timeout/retry/error classification, strict mock capabilities DTO, pure server-bound Admin CSRF + exact Origin policy, separate Reader owner identity checks, and Gateway rejection of Range/WS/SSE header variants. [Phase02 RESULT](phase-02/RESULT.md) and [machine handoff](phase-02/HANDOFF.json) document file paths and unfinished tasks.

**Current code validation:** New mock/auth source and test changes must pass their own exact latest-HEAD CI; pending at this checkpoint. Previously passing Phase02 CI #40899699146 applied to **older** bootstrap source. No live Official transport, no admin login/session resolver, no provisioned reader device, no production or runtime security approval. No human/independent Phase02 code review accepted.

**Gate state remains NOT GATEWAY_CODE_REVIEWED.** Phase00 design-locked and Phase01 foundation-reviewed remain historical accepted artifacts; root `ACTIVE-SESSION.json.phaseStatus` stays `FOUNDATION_REVIEWED` to satisfy immutable Phase00 gate until a separately reviewed Phase02 state transition is added. Live security checks [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4) are not met; all Official proxy candidates DENY, native KO progress and sensitive personal/session/metadata/reset bridges OFF. Full integrated E2E Phase09 only.

---

## CURRENT — Phase02 Started on reviewed integration (2026-10-29)

**GitHub:** [Draft PR #6](https://github.com/0xstillb/Grimmlink-Next/pull/6), `feat/next-phase-02` based on Phase01 merged integration SHA [0579f64](https://github.com/0xstillb/Grimmlink-Next/commit/0579f64afb2d53001c915a10079d00ecd9de0091). **Exit status:** `IN_PROGRESS_FAIL_CLOSED`, NOT `GATEWAY_CODE_REVIEWED`.

**Code checkpoint:** a new deny-by-default `route-policy` classifier and `onRequest` Fastify pre-body rejection, `/api/grimmlink/v2/capabilities` reporting OFF/DENY, tests for path/header/method and synthetic KO secrets, plus dedicated Phase02 isolated CI. Exact SHA and live test conclusions must be checked on PR #6; initial test status was PENDING. [Phase02 RESULT](phase-02/RESULT.md) and [HANDOFF](phase-02/HANDOFF.json) are the checkpoint.

**Gate compatibility:** the top-level `ACTIVE-SESSION.json` still retains immutable Phase01 `FOUNDATION_REVIEWED` because the Phase00 validator has no accepted Phase02 state. A separate `phase02Work` record identifies the active phase. Do NOT flip that root state and silently bypass the existing validator; a new gated phase-state transition must be introduced and reviewed.

**Security:** no Official upstream transport or forwarding, no direct port, no real Grimmory API/NAS/readers, no metadata/personal/session writes, no Native KO progress. `officialGatewayForwarding=DENY_ALL`, everything sensitive OFF, production unauthorized. Outstanding hard gates: [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4) runtime Spring routes/filter chains, host/SNI and direct ingress, least privilege ACL, KO secret log-sink, typed Official REST mocks, separate admin/user auth+CSRF, Range/WebSocket/SSE, independent review. **Full E2E Phase09 only.** No merge into integration/main.

---

## LATEST — Phase01 CLOSED AT TECHNICAL EXIT GATE (2026-10-29)

**Current phase status:** `FOUNDATION_REVIEWED` (fresh-context independent GPT-6 technical PASS for isolated foundation); reviewed application source [2eb613b0](https://github.com/0xstillb/Grimmlink-Next/commit/2eb613b0cac39b689710501cc3dbad812e5486a2), independent GitHub reviewer `COMMENTED` ID `5699254459` (not a distinct human APPROVE). [Exact reviewed-source Phase00 CI #40888013634](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40888013634) SUCCESS; [Phase01 CI #40888013081](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40888013081) SUCCESS, including ARM64 offline health/SQLite WAL. The separate release-gate/metadata closure commits require exact final HEAD CI readback. See [RESULT](phase-01/RESULT.md), [HANDOFF](phase-01/HANDOFF.json), [final immutable attestation](phase-01/FINAL-INDEPENDENT-REVIEW-ATTESTATION-2026-10-29.md) and authoritative [ACTIVE-SESSION](ACTIVE-SESSION.json).

**No automatic merge or runtime authorization:** Draft [PR #5](https://github.com/0xstillb/Grimmlink-Next/pull/5) remains UNMERGED; production NOT_AUTHORIZED, Official gateway DENY_ALL, all sensitive bridges OFF. Phase02/05/07 require their own runtime security acceptance; full real E2E is Phase09. Earlier headings below are historical snapshots and **not** the current phase status.

---

## LATEST — PHASE01 CHANGES_REQUIRED REMEDIATION (2026-10-29; RE-REVIEW PENDING)

[Independent Phase01 review](phase-01/REVIEW.md) at exact `7160eca` found 5 issues (2 high, 3 medium). Implementer patches at code checkpoint `d14a84d7bf1359e22846db6729fc4d6b6f060dd8` address all five; [remediation receipt](phase-01/REMEDIATION-2026-10-29.md) links implementation and regression tests. Phase00 gate #40883141347 passed. Phase01 code CI #40883141411 was pending when recorded; final docs commit requires **new exact HEAD** CI. Do not infer PASS from earlier commits.

**Status: `FOUNDATION_IN_PROGRESS / CHANGES_REQUIRED / RE_REVIEW_PENDING`**. No second independent verdict, no merge, no Phase02, no upstream forwarding, sensitive sync, or production. Full E2E Phase09 only.

---

## LATEST — PHASE01 IMPLEMENTER SECURITY FOLLOW-UP (2026-10-29; REVIEW PENDING)

Branch `feat/next-phase-01` / [Draft PR #5](https://github.com/0xstillb/Grimmlink-Next/pull/5), source checkpoint [`04d72a3`](https://github.com/0xstillb/Grimmlink-Next/commit/04d72a3a31953b8be4d6a7295d17ea7435194f20). [`c9dd8cd`](https://github.com/0xstillb/Grimmlink-Next/commit/c9dd8cd08a7c8b64933660d5c1f0bee6a994a1d4) hardens local SQLite file creation and directory privacy with negative tests and private container data directory; [`04d72a3`](https://github.com/0xstillb/Grimmlink-Next/commit/04d72a3a31953b8be4d6a7295d17ea7435194f20) prevents calling an unverified Book ID "verified". [Phase00 gate #40876891650](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40876891650) succeeded at code SHA. [Phase01 isolated CI #40876891637](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40876891637) pending at this writing; do not claim latest full CI PASS. A docs-only commit after this receipt requires fresh exact-HEAD checks.

Gate remains `FOUNDATION_IN_PROGRESS / INDEPENDENT_REVIEW_PENDING`. Prettier check is not enforced; Docker base digest pin does not replace an explicit CVE rotation review. Independent fresh-context exact-diff review and its `phase-01/REVIEW.md` verdict do not yet exist. No Official forwarding, upstream personal/session sync, NAS or physical tests, production, Phase02 start or merge. Full E2E deferred to Phase09.

---

## LATEST VERIFIED — PHASE01 SOURCE AND ARM64 ISOLATED CI GREEN (2026-10-29)

**Actual source SHA:** [223c0d5b](https://github.com/0xstillb/Grimmlink-Next/commit/223c0d5b2fa2fd5249f0e9719b5ca632f5d65209) — [isolated frozen+ARM64 CI 40872799995](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40872799995) SUCCESS. Phase00 integrity [40873402518](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40873402518) SUCCESS on more recent handoff status. [Draft PR #5](https://github.com/0xstillb/Grimmlink-Next/pull/5) stays open, Draft/unmerged.

Frozen pnpm, TypeScript, ESLint, local mock/unit tests including safe logs + scoped TTL, native SQLite on Linux ARM64 image, no-network compose were executed and passed. This does **not** authorize any Grimmory upstream operation, user/book permission, production/migration or E2E. Phase01 **FOUNDATION_IN_PROGRESS; fresh independent review still required.** Full Hermes/NAS/readers E2E Phase09.

---
## CURRENT — PHASE 01 FOUNDATION IMPLEMENTED, REVIEW PENDING (2026-10-29)

**Branch:** `feat/next-phase-01`, [Draft PR #5](https://github.com/0xstillb/Grimmlink-Next/pull/5) -> `integration/grimmlink-next`; base `4b4a924cf225734dab0d17114f878b5b1982d4a9`. Latest committed code changes through [223c0d5b](https://github.com/0xstillb/Grimmlink-Next/commit/223c0d5b2fa2fd5249f0e9719b5ca632f5d65209); branch tip has later CI/workflow-only commit, always fetch LIVE.

**Verified exact-code CI:** [Run 40872300890](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40872300890) SUCCESS on `5dd677e5`: frozen pnpm install, native SQLite build, full workspace build/typecheck, ESLint, isolated unit/mock tests, Docker ARM64 build, no-network ARM64 architecture and compose policy check. [Phase00 source/design-lock gate](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40872891080) SUCCESS on newer pre-handoff `836c5268`. New error/diagnostic sanitizer change `223c0d5b` requires exact-HEAD CI readback before accepting.

**Implemented:** TypeScript monorepo; Fastify /health and generated /openapi.json (loopback-only); strict TypeBox env; SQLite WAL + versioned Drizzle schema, transactional job leases, verified private backup/restore to NEW location, personal-outbox schema only; Pino credential/redaction canaries and bounded diagnostic controls; non-connected React/Vite dark control center; typed no-upstream modules; ARM64 container and bounded compose log caps. **No Official forwarding, no real sync.**

**Status:** `FOUNDATION_CODE_IMPLEMENTED_REVIEW_PENDING`, not `FOUNDATION_REVIEWED`. Need independent fresh-context exact diff review and latest CI readback. Docker base still patch-tag not immutable digest; final integrated E2E only Phase09.

**Security:** Phase00 `PASS_PHASE00_DESIGN_ONLY`, not runtime security pass. [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4) blocks gateway/security and personal/sync until Phases02/05/07. All bridges and proxy remain OFF; no main, integration merge or production.

---

## CURRENT — PHASE 01 FOUNDATION IN PROGRESS (2026-10-29)

**Authoritative GitHub:** [Draft PR #5](https://github.com/0xstillb/Grimmlink-Next/pull/5), `feat/next-phase-01` from merged integration HEAD `4b4a924cf225734dab0d17114f878b5b1982d4a9`. **Last verified code SHA:** [77a54dc070fa8e2660329c40ebd57c86b68dbdf5](https://github.com/0xstillb/Grimmlink-Next/commit/77a54dc070fa8e2660329c40ebd57c86b68dbdf5). This checkpoint commit must be read back LIVE before the next change.

**Implementation actually committed:** pnpm TypeScript workspace; strict TypeBox config; local-only Fastify health with zero Official forwarding; Pino redaction plus log-sink canary and bounded ephemeral diagnostic leases; Drizzle SQLite local metadata schema/migrations/WAL/atomic local lease; React/Vite dark placeholder Control Center with keyboard buttons. No real metrics, sync, networking to Grimmory or physical devices.

**Real isolated CI:** [Phase01 run 40868473874](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40868473874) **SUCCESS** on exact code SHA `77a54dc`: install (--no-frozen-lockfile), approved SQLite native rebuild, build, typecheck, injected mocks and unit tests. Earlier failed runs detected and were corrected: TS4058, TS2322/TS2742, pnpm10 native binding. This success is **not** a frozen-lock reproducible build and does not prove ARM64 or live integration.

**State:** `CODE_COMMITTED_TESTS_PASS_ISOLATED` / `FOUNDATION_IN_PROGRESS`; **NOT** `FOUNDATION_REVIEWED`. No independent Phase01 review, approved reproducible pnpm lockfile, Docker ARM64 verification, OpenAPI, migration backup/restore test, complete domain packages, live health/dashboard binding or full accessibility review. [Phase01 Notion spec](https://app.notion.com/p/407c7efbc0098130a215ebe15c887e4f).

**Safety invariant:** Phase00 `PASS_PHASE00_DESIGN_ONLY` permits foundation *only*. All Official static 403 route candidates remain DENY; no gateway, native KO progress, OPF apply, personal/session bridge or reset. [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4) is hard security gate for Phase02/05/07. Full Hermes/NAS/reader E2E deferred to Phase09; `main` and production untouched.

**Next action:** obtain/review/commit deterministic pnpm-lock.yaml; switch CI to frozen lockfile; implement durable migration backup/restore, OpenAPI/config/error contracts, safe scoped diagnostics runtime control and remaining package modules; independently review exact source diff before exiting Phase01. Do not merge draft PR yet.

---

## CURRENT — Phase00 DESIGN-ONLY CONTRACT LOCK (2026-10-29; fresh-context review)

**Latest authoritative disposition:** `PASS_PHASE00_DESIGN_ONLY`, `CONTRACT_LOCKED_DESIGN_ONLY`, `PHASE01_AUTHORIZED=FOUNDATION_ONLY`. A separate GPT-6 fresh context reviewed pinned pre-review HEAD [f071229d](https://github.com/0xstillb/Grimmlink-Next/commit/f071229d9d9a1b7fb680cb68f83c763bc53138c6), upstream source, PR #2 and Phase00's Notion acceptance scope. [New independent design-only review](phase-00/FRESH-CONTEXT-DESIGN-LOCK-REVIEW-2026-10-29.md). **Not an approval by a separate GitHub human account.** Historical `CHANGES_REQUIRED` reviewer reports are preserved.

**Only Phase01 TS core, persistence and observability may begin.** No upstream HTTP exposure or sensitive feature is authorized. Source census 923 SHA/AST files, 403 static method/path/verb variants, 348 handler mappings, 43 priority source reviews and 109 fixture definitions were verified by prior source/static CI. These are NOT effective runtime routes, applied authorization, or live negative tests. All 403 gateway forwarding candidates remain DENY; KO Native progress, metadataApply, personal/app reset/rating, managedProjection and session bridge remain BLOCKED/OFF by **design, not deployed enforcement**. Actual Spring runtime SecurityFilterChain, gateway isolation, per-user/book/file ACL, KO secret-safe logging and SQLite faults remain Phase02/05/07 hard gates; full Hermes/NAS/device integrated E2E Phase09. No main/production changes. PR #2 integration merge is a separate action after exact HEAD CI and policy review.

---

## NEW-P0-01 SOURCE MECHANISM SUBGATE — VERIFIED 2026-10-29 (NOT A SECURITY PASS)

[Actual pinned source audit CI 40853316961](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40853316961) SUCCESS on source audit commit `8653ecd8c5f719643fd5950f36aeea58a732e8a9`. [Per-HEAD source/static integrity CI 40853316919](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40853316919) SUCCESS. [Auditor](../../scripts/phase-00/audit-route-mechanisms.py) / [mechanism reconciliation](phase-00/NEW-P0-01-SOURCE-MECHANISM-RECONCILIATION.md) use pinned source and 30-day `new-p0-01-source-mechanism-receipt` artifact. **923 SHA/AST files, 715 source signals, 17 programmatic/type signals, 160 inherited/interface flags, 65 repository interfaces and 403 method/path/verb candidates** reconciled; new unknown mechanism fails CI. 43/43 priority auth source dispositions stay 0 allowed. This is a **source mechanism enumeration subgate only**: `SOURCE_ANNOTATION_COMPLETE=false`, Spring runtime, direct backend ingress, current book ACL and Gateway enforcement NOT_RUN/NOT_PROVEN. NEW-P0-01 formal security acceptance remains pending distinct independent reviewer adjudication of Phase00-vs-Phase02 boundary. **Historical CHANGES_REQUIRED, CONTRACT_LOCKED=false and PHASE01_AUTHORIZED=false are unchanged.** No runtime/production/merge authorization.

---

## PHASE00 LATEST REVIEW-GATE EVIDENCE — 2026-10-29: INDEPENDENT PASS STILL REQUIRED

[GitHub Actions 40831672425](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40831672425) SUCCESS: 403/403 pinned Official method/path/verb source variants classified against ordered SecurityConfig source chain candidates; all 403 DENY gateway forwarding, not executable runtime Spring authorization. **348 mapping records but only 346 unique method names** due to overloaded BookCoverController#regenerateCovers and FileUploadController#uploadFile. Fixed source-key collision by using file + mapping line + handler. Exactly one representative matcher ambiguity for /api/v1/opds versus OPDS /** root; runtime decision NOT_RUN.

[GitHub Actions 40831960179](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40831960179) SUCCESS: machine [Phase00 gate integrity checklist](phase-00/PHASE00-GATE-STATUS.json) verifies 923/923 SHA+AST, 15/15 source constants, 43/43 auth source triage with 0 authorized, 348/348 source handler records, 403/403 route candidates, 160 inheritance flags, 65 repositories, 109/109 static fixture definitions, unmodified independent review report. It correctly enforces **contractLocked=false and phase01Authorized=false** pending real proof.

[Fresh independent review request](phase-00/PHASE00-FRESH-INDEPENDENT-REVIEW-REQUEST-2026-10-29.md) requires a separate reviewer to determine whether a Phase00 design-only contract can accept deferral of runtime Gateway/Spring/log-sink/authorization tests to Phase02/05/07/09, or whether NEW-P0-01 remains an independent Phase00 blocker. **Reviewer not yet run.** Existing verdict **CHANGES_REQUIRED / CORRECTION_INCOMPLETE / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** remains. Do not merge/deploy/unblock Phase01 or sensitive features. Older historical checkpoints below remain historical.

---

## 2026-10-29 — AUTHORIZATION SOURCE REVIEW 43/43 STATIC_CLOSED; SECURITY GATE REMAINS BLOCKED

**Source-level Authorization Review:** [CI 40830006159](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40830006159) SUCCESS verifies **43/43 prioritized no-local-annotation mutating handler source dispositions** (all controller/method positions and pinned supporting service witnesses, zero missing). Implementer triage: **6 CRITICAL / 29 HIGH / 4 MEDIUM / 4 LOW**, not CVSS/exploit confirmation. **ZERO of the 43 may be forwarded / approved**; 348 handlers remain documentary deny-by-default pending precise runtime chain and per-book/user authorization. [Full source finding and gate receipt](phase-00/PHASE00-AUTHORIZATION-REVIEW-43-STATIC-DISPOSITION-2026-10-29.md).

**New risk source flags:** mutable request token stored on KoboController singleton-like field; nested file ID progress not visibly bound to requested book; KO book hash not visibly checked against current user library/content; Magic Shelf public-create privilege absent in inspected creation branch; Kobo path/body entitlement mismatch; race safety of public first-admin setup unproven; KO registration request body/header log disclosure risks. No production exploitation asserted. Added 6 synthetic regression contracts: **109/109 fixtures STATIC_PASS in [CI 40830218540](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40830218540)**; actual Gateway/mock HTTP/log-sink/concurrency/SQLite tests **NOT_RUN**. Preserve earlier 923 Java AST/SHA, 403 static route declarations, 15/15 symbolic source constants, 160 classified inheritance files as source evidence, not runtime gates.

**Phase status remains CORRECTION_INCOMPLETE / CHANGES_REQUIRED (prior independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** NEW-P0-01 BLOCKED; no independent re-review, no PR merge/deploy/production or Phase01. Previous checkpoint counts (103 fixtures, 43 unreviewed source dispositions) below are historical.

---

## LATEST VERIFIED PHASE00 CHECKPOINT — 2026-10-29 (IMPLEMENTER SOURCE ONLY)

[CI 40828172115](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40828172115) SUCCESS: 923/923 pinned Java bodies SHA+AST; 348 source method handlers/403 declared method-path-verb variants (NOT runtime route count); 15/15 source constants. **160 lexical extends/implements files now classified by source AST**: 65 repository types, 49 service types, 10 security filter/interceptors, 9 model, 7 task, 7 converter, 11 other, 2 Web configuration. **0 direct method-mapping files** among those 160, yet inherited/alternate semantics remain NOT_PROVEN. Full pinned 923-file + Gradle scan found no Spring Data REST source symbols or direct dependency declarations, narrow source indicator only, NOT no-REST runtime proof.

**Critical KO logging source risk:** Registration handler logs incoming userData map at WARN; Official request logging config includes payload (10k limit) and headers but excludes neither x-auth-user nor x-auth-key by name. Actual output depends on runtime logger/chain, NOT_RUN. Added 2 synthetic KO payload/header log-sink fixtures; **103/103 fixture definitions static PASS**, actual HTTP/Gateway/log-sink tests NOT_RUN. [Detailed pinned source receipt](phase-00/PHASE00-INHERITANCE-AND-KO-LOGGING-TRIAGE-2026-10-29.md). Other 348 authorization owners still DENY_BY_DEFAULT, 43 mutating handlers require ACL, 9 call chains/37 source witnesses verified only narrowly.

**NEW-P0-01 BLOCKED, CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED**. PR #2 remains Draft, no merge/deploy/Phase01. Earlier counts (101 fixtures / unclassified 160) in historical sections below are superseded. This is not independent approval.

---

## LATEST IMPLEMENTER PROOF — 2026-10-29, Phase00 REMAINS SECURITY-BLOCKED

[CI 40821817455](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40821817455) SUCCESS (source/static only): **923/923 pinned Java contents Git-SHA/AST-verified, 348 method handlers, 403 static method/path/verb declarations (NOT runtime routes)**. All **15/15 symbolic mapping constant expressions** have exact value evidence: 9 from pinned Official OpdsController, 6 from locked spring-web 7.0.9 and pinned Spring Framework MediaType source SHA. Source-only value interpretation is complete; Spring runtime classpath/matcher NOT_RUN.

**348 source authorization ownership entries remain deny-by-default**, with **43 mutating handlers without local annotation** requiring global/service/record checks. **9 sensitive call chains / 37 source witnesses** validated in pinned Official; only narrower library-ID/user-record source checks are proven, current content revocation and complete gateway entitlement are NOT. **160 lexical inheritance/interface files** remain scope-review flags; **101 synthetic fixture definitions** pass static validation, all actual mock HTTP/SQLite/Gateway tests NOT_RUN. [Full source receipt](phase-00/PHASE00-PINNED-SOURCE-SEMANTIC-ACL-RECEIPT-2026-10-29.md).

**NEW-P0-01 remains BLOCKED; CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** Feature HEAD before documentation sync `e052e9223a72785dc0ca16989c46db1547c132ac` (fetch live after commit). PR #2 Draft/Unmerged, no official backend exposure, no main/integration edits, no Phase01. Prior checkpoints below are historical, particularly 97 fixtures and 15 symbolic conditions being unresolved.

---

## LATEST VERIFIED STATIC EVIDENCE — Phase00 Route Semantics, 2026-10-29 (NOT Independent Approval)

[CI run 40819253130](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40819253130): pinned 923/923 Java bodies SHA-verified and AST parsed (0 errors), 64 Controller markers, 63 class +348 method =411 mapping annotations, **403 static method/path/verb declarations (not runtime route count)**. All method paths resolved; **15 symbolic consumes/produces conditions** still require semantic resolution. **223 security annotation signals**, **15 programmatic** and **2 framework-type signals**; **43 mutation handlers without local annotations** require global/service ACL investigation (not proof of unauthenticated access).

**101 security fixture definitions** (97 prior +4 WebSocket/static), static validator zero failures, every actual security/mock HTTP/SQLite test NOT_RUN. [Source auth audit](phase-00/SOURCE-ROUTE-SEMANTIC-AND-AUTH-REVIEW-2026-10-29.md) has pinned SecurityConfig chain evidence. SOURCE_ANNOTATION_COMPLETE=false; RUNTIME_ROUTE_COMPLETE=NOT_RUN; NEW-P0-01 BLOCKED. CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED; no PR merge. Older checkpoints below are historical and superseded only as to 859 unread bodies and 97 current fixtures.

---

## CURRENT EVIDENCE — 2026-10-29 pinned full Java body scan (implementer, NOT reviewer approval)

**Verified static CI:** [Actions run 40817012499](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40817012499) and [source evidence commit](https://github.com/0xstillb/Grimmlink-Next/commit/0b6fef1002c8a86fa5e15a2c416c16ff1b64ae9a). All **923/923** pinned Java bodies were read, SHA checked and AST parsed, **0 errors**. Exactly **64 Controller markers, 348 method mapping +63 class mapping =411 mapping annotation occurrences**, NOT 411 HTTP routes. Additional **15 programmatic signals**, including WebMvcConfig static **/*** resource fallback, OPDS/Komga interceptors and WebSocketConfig **/ws** handshake; see [source mechanism reconciliation](phase-00/SOURCE-WIDE-MECHANISM-RECONCILIATION-2026-10-29.md) and [per-file ledger](phase-00/JAVA-SOURCE-WIDE-CENSUS.json). (Links here are relative to docs/implementation for documents in that directory; Phase00 files use local equivalents.) **97 fixtures** static validated, zero static failures, all actual negative tests **NOT_RUN**.

**IMPORTANT:** prior statements describing 859 unread Java bodies are historical and superseded *only as to content-read coverage*. The source has **161 files with lexical inheritance/semantic questions**; 348 method mappings, aliases/conditional/proxy, WebSocket/static, gateway auth ownership and Spring runtime evidence are **NOT yet contract complete**. `SOURCE_ANNOTATION_COMPLETE=false`, `RUNTIME_ROUTE_COMPLETE=NOT_RUN`. **NEW-P0-01 remains P0 BLOCKED**. Historical Independent verdict **CHANGES_REQUIRED** unchanged. **CORRECTION_INCOMPLETE / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED**. Do not self-approve/merge PR #2, start Phase 01 or expose Official backend. Feature gates for personal writes, native KO progress, metadata apply and session outbox remain OFF/BLOCKED.

## CURRENT — Phase00 Final Security Correction Checkpoint (2026-10-29; implementer, not independent approval)

Start `1370f9f38482af1442a3ecd7570e7dbbc4ac3bdd` (independent report commit); independently reviewed immutable HEAD `9682f9ce9305ea5242af82418bec7e504bf1ca03` is distinct; fixture/security-design correction commit `496681b307dd71fefedb649d951079557dc431f9`. **97 synthetic fixture definitions (70 original + 27 added, 11 modified); all execution NOT_RUN**. See [final correction report](phase-00/FINAL-SECURITY-CORRECTION-2026-10-29.md), [KO contract](phase-00/KO-CREDENTIAL-GATEWAY-CONTRACT.md), [App ACL](phase-00/APP-AUTHORIZATION-MATRIX.md), [Phase acceptance](phase-00/CONTRACT-LOCK-ACCEPTANCE-CRITERIA.md). **NEW-P0-01 remains P0 BLOCKER**: 923 Java files in pinned tree but only 64 named controllers/348 annotations previously read, full remaining source-wide audit not completed; runtime Spring routes NOT_RUN. NO SOURCE_ANNOTATION_COMPLETE claim. KO logging mitigations are DESIGN_SPECIFIED, not deployed; metadata/session post-send fixtures now use UNKNOWN remote mutation. Native KO progress, metadataApply, personal bridges, resets and session writes BLOCKED/OFF (design-only). **Independent verdict remains CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** PR #2 Draft / do not merge; full E2E Phase09 only.

---

## CURRENT — 2026-10-29 Complete App Route & Security Contract Correction (implementer; pending independent review)

**Branch pre-correction HEAD:** `9eb7790367d2272e430ee78d2323952960234c00`; subsequent commits must be checked LIVE on [Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2). Prior independent verdict **CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** remains authoritative. **Recognized controller file census 64/348 method-level annotations** (56/321 root + 8/27 App; source annotation completeness across all Java and runtime mappings UNVERIFIED). [App census](phase-00/ROUTE-CENSUS-APP.md) · [Mapping expansion](phase-00/ROUTE-MAPPING-EXPANSION.md) · [Route ownership](phase-00/SECURITY-ROUTE-OWNERSHIP.md) · [Correction report](phase-00/ROUTE-COVERAGE-SECURITY-CORRECTION-2026-10-29.md) · [Reviewer packet](phase-00/NEXT-INDEPENDENT-REVIEW-PACKET.md).

**Feature gates (DESIGN_SPECIFIED, not runtime OFF switches):** `NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF`, metadata apply OFF, reset-progress/rating OFF, personal bridge reads/writes OFF, sessions bridge OFF. No atomic native KOSync ACL proof; Gateway precheck is not atomic; no zero-lost-update proof for Official metadata REST; session 202 is not immutable idempotent receipt. Runtime, unit/mocks, gateway, network and E2E NOT_RUN. Phase09 only full E2E/Hermes/NAS/devices. Do not merge PR #2, approve Phase01, or mark new findings independently APPROVED.

---

## Latest Phase00 Security Remediation — 2026-10-29 (NOT independent approval)

**R-02A NEW P0:** Official `POST /api/v1/books/reset-progress` (BOOKLORE/KOREADER/KOBO) and `POST /api/v1/books/reset-personal-rating` require deny-before-upstream gateway coverage, current assigned-library/content eligibility for EVERY book ID, own-record eligibility and all-or-nothing mixed-batch rejection. Other sensitive routes include viewer-setting, shelves, notes v1/v2, PDF annotations, session reads/writes and KO profile. **56 source Controller files / 321 method-level annotations** inspected; runtime Spring mapping/aliases NOT_RUN. No generic sensitive fallback. **NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF**: precheck TOCTOU not atomic. `metadataApply=OFF`, `personalBridgeWrites=OFF`, `sessionsBridgeWrite=OFF`; design != executable enforcement. Historical **CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** unchanged; no merge or Phase01. Correction baseline `59773bd65eb265dbe4850204a65649b7c8a5c51c`, read LIVE HEAD for new commits.

[Security remediation](phase-00/SECURITY-REMEDIATION-2026-10-29.md) · [Full annotation census](phase-00/ROUTE-CENSUS-INDEX.md) · [ADR-025](ADR-025-NATIVE-KOSYNC-SECURITY.md)

<!-- Current 2026-10-29 reviewer packet: [RE-REVIEW-PACKET.md](phase-00/RE-REVIEW-PACKET.md). Prior checkpoints below historical. -->
# GRIMMLINK NEXT — GPT Web Session Handoff

## HISTORICAL — 2026-10-29 Implementer Final Remediation (RE-REVIEW REQUIRED)

**Implementation-document checkpoint:** `IMPLEMENTER_FINAL_REMEDIATION_COMMITTED_AWAITING_FRESH_INDEPENDENT_REVIEW`. This is **not** reviewer approval. Last actual independent verdict [FINAL-INDEPENDENT-REVIEW-2026-10-29.md](phase-00/FINAL-INDEPENDENT-REVIEW-2026-10-29.md) = **CHANGES_REQUIRED / NOT_APPROVED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** (8 DOC_FIXED / 4 DOC_PARTIAL on cea6485). See [FINAL-REMEDIATION-2026-10-29.md](phase-00/FINAL-REMEDIATION-2026-10-29.md). Fetch live GitHub HEAD (prior starting SHA `f263e6208d9dc520e29e3113dcf6bd632f239b72`), do not embed self SHA. PR #1 merged into integration in history; PR #2 remains Draft. R-02 KOSync progress **BLOCKED/OFF** due to non-atomic no-fork ACL proof, other metadata/personal/session writes OFF. All real integrated E2E Phase09 only; no Phase01 or merge.


## HISTORICAL FRESH FINAL INDEPENDENT REVIEW — 2026-10-29 (supersedes review-pending banners below)

- The independent reviewer inspected corrected source/document HEAD `cea648544547c4d2b3f5c652bfc75d408288b7c7` against `411b68bd1ed2ffeca28165c55cc52fda6d88ea6c` and independently read Grimmory v3.5.0 / Readest v0.12.16 source. [Final review](phase-00/FINAL-INDEPENDENT-REVIEW-2026-10-29.md): **CHANGES_REQUIRED, 8 DOC_FIXED / 4 DOC_PARTIAL / 0 DOC_UNFIXED**, not CONTRACT_LOCKED. Review own handoff edits are NOT self-approved.
- Remaining: R-01 P0 scalar allowlist, R-02 P0 authoritative user-to-book entitlement and bypass-free public :6060 gateway, R-09 P1 uncertain-session ACK/at-most-once, R-11 P1 stale historical handoff. **External KOSync progress BLOCKED/OFF**, personal bridge/metadata writes OFF. Never allow blind Official passthrough, impersonation, or source NAS writes.
- Phase00 corrections need a NEW independent review before CONTRACT_LOCKED. **Do not merge Draft PR #2, modify main, or start Phase01.** Source-only review + JSON validation; build/unit/mock/live API NOT_RUN; integrated Hermes/NAS/physical readers/full E2E Phase09 only. Obtain the real current branch SHA from GitHub, not from this file.


## NEW INDEPENDENT RE-REVIEW — 2026-10-29 (read first)

- [Re-review report](phase-00/RE-REVIEW-2026-10-29.md) evaluated original correction HEAD `411b68bd1ed2ffeca28165c55cc52fda6d88ea6c` and issued **CHANGES_REQUIRED**. Review documents R-01–R-12 and source evidence, not hardware/runtime PASS.
- Same session authored **subsequent** contract/gateway/metadata/Sidecar clarity fixes. Those new changes are **not independently re-reviewed**; new reviewer must inspect actual diff after `411b68` and assess the remaining design-level auth gate. **NOT CONTRACT_LOCKED, NO Phase01, no merge**; full integrated E2E Phase09 only. Fetch live HEAD.


## HISTORICAL CORRECTION CHECKPOINT — 2026-10-29 (supersedes earlier reviewed head below)

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
