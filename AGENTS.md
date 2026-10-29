## CURRENT — Phase02 single-port MOCK Gateway CI PASS / hard runtime gates OPEN (2026-10-29)

[Draft PR #6](https://github.com/0xstillb/Grimmlink-Next/pull/6) remains **OPEN / DRAFT / NOT MERGED**. From integrated Phase01 `0579f64`, Phase02 has Caddy :6060 host-loopback single-port mock topology, Adapter 127.0.0.1:6061 private shared network namespace, fail-closed all-Official routing, pure Admin/Reader CSRF/ownership policies, typed mock-only REST client, synthetic all-or-none per-book/file/row entitlement, and source/runtime evidence hold gate. [Phase02 RESULT](docs/implementation/phase-02/RESULT.md) / [HANDOFF](docs/implementation/phase-02/HANDOFF.json) and [independent review request](docs/implementation/phase-02/INDEPENDENT-REVIEW-REQUEST.md).

**Last proven Docker mock run:** [CI #40905567097](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40905567097) **SUCCESS** at exact source `150bd87f471b242903c8da1147597afffcb29af6` (two jobs; isolated Caddy-Adapter HTTP, unit and mock). Extended log canary and docs commits occurred **after** that SHA; read live HEAD CI before claiming full green. Docker bridge only publishes host-loopback and does **not prove egress isolation**. Caddy HTTP/no TLS is strictly local mock, not production-ready.

**Gate:** `GATEWAY_CODE_REVIEWED` **NOT GRANTED**; no live Spring `RequestMappingHandlerMapping`/`SecurityFilterChain`/current record rights, authenticated Official JWT/device pairing, production TLS/direct IPv4+IPv6/egress proof or separate-context independent review. [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4) remains HARD BLOCK. All Official upstream candidates `DENY_ALL`; native progress/metadata/personal/session/reset bridges OFF. No Hermes/NAS/real readers until Phase09. Root `ACTIVE-SESSION.phaseStatus=FOUNDATION_REVIEWED` remains Phase01 immutable receipt while `phase02Work` is live active phase; do not forge Phase02 security state.

---

## CURRENT — Phase02 MOCK_CLIENT_AUTH_IN_PROGRESS (2026-10-29; Draft PR #6)

**Live source:** [Phase02 Draft PR #6](https://github.com/0xstillb/Grimmlink-Next/pull/6) based on merged Phase01 integration commit `0579f64afb2d53001c915a10079d00ecd9de0091`. Current Phase02 work is recorded in `docs/implementation/ACTIVE-SESSION.json.phase02Work`, [Phase02 RESULT](docs/implementation/phase-02/RESULT.md) and [HANDOFF](docs/implementation/phase-02/HANDOFF.json). The root `phase=01 / FOUNDATION_REVIEWED` fields remain as an immutable compatible foundation receipt until Phase02 state gate is formally reviewed; they do **not** indicate Phase02 is inactive.

**Code:** local Fastify gateway pre-request deny-all for Official, strict canonical header/path/method/Range/WS/SSE checks, mock-only typed Official GET transport with no global fetch/no live endpoint, bounded retry/timeout and sanitized errors, pure Admin session-bound CSRF/Origin guard, Reader same-owner policy, synthetic tests. **No live session authentication is wired, no trusted Official REST transport or Gateway forwarding exists, no production route is authorized.** Latest source and CI result must be checked at exact GitHub branch HEAD; do not assume earlier bootstrap CI covers later code changes.

**Security:** all 403 Phase00 *static source route candidates* still DENY; no new Spring runtime mapping equivalence, user/library/book/file/row atomic rights, host/IPv4/IPv6 ingress isolation or separate human/independent Phase02 technical verdict. [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4) remains open. Sensitive bridges OFF; full real Hermes/NAS/device E2E Phase09 only. PR stays DRAFT/UNMERGED, integration/main unchanged by Phase02.

---

## CURRENT — Phase01 FOUNDATION_REVIEWED (2026-10-29; isolated foundation technical acceptance)

**Authoritative latest state:** `docs/implementation/ACTIVE-SESSION.json` = `FOUNDATION_REVIEWED`, backed by [independent fresh GPT-6-context technical review ID 5699254459](https://github.com/0xstillb/Grimmlink-Next/pull/5) for reviewed application source [2eb613b0](https://github.com/0xstillb/Grimmlink-Next/commit/2eb613b0cac39b689710501cc3dbad812e5486a2). [Reviewed-source Phase00 #40888013634](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40888013634) and [Phase01 #40888013081](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40888013081) both SUCCESS. Closure-commit exact-HEAD CI must be checked in GitHub. [Final review attestation](docs/implementation/phase-01/FINAL-INDEPENDENT-REVIEW-ATTESTATION-2026-10-29.md) and [Phase01 handoff](docs/implementation/phase-01/HANDOFF.json).

**Scope and distinction:** The independent review is a separate GPT-6 context, submitted as GitHub `COMMENTED`, not a distinct human GitHub `APPROVE`. PR #5 remains DRAFT / UNMERGED pending separate integration authorization; `main` untouched. Foundation acceptance does **not** authorize Phase02 gateway, real Official/NAS/reader access, Phase05/07 sensitive writes, production, or integrated E2E (Phase09). All `safety` and `securityCapability` declarations remain exactly fail-closed. Historical review/pending checkpoints below are preserved unchanged for audit.

---

## CURRENT — Phase00 DESIGN-ONLY CONTRACT LOCK (2026-10-29; fresh-context review)

**Latest authoritative disposition:** `PASS_PHASE00_DESIGN_ONLY`, `CONTRACT_LOCKED_DESIGN_ONLY`, `PHASE01_AUTHORIZED=FOUNDATION_ONLY`. A separate GPT-6 fresh context reviewed pinned pre-review HEAD [f071229d](https://github.com/0xstillb/Grimmlink-Next/commit/f071229d9d9a1b7fb680cb68f83c763bc53138c6), upstream source, PR #2 and Phase00's Notion acceptance scope. [New independent design-only review](docs/implementation/phase-00/FRESH-CONTEXT-DESIGN-LOCK-REVIEW-2026-10-29.md). **Not an approval by a separate GitHub human account.** Historical `CHANGES_REQUIRED` reviewer reports are preserved.

**Only Phase01 TS core, persistence and observability may begin.** No upstream HTTP exposure or sensitive feature is authorized. Source census 923 SHA/AST files, 403 static method/path/verb variants, 348 handler mappings, 43 priority source reviews and 109 fixture definitions were verified by prior source/static CI. These are NOT effective runtime routes, applied authorization, or live negative tests. All 403 gateway forwarding candidates remain DENY; KO Native progress, metadataApply, personal/app reset/rating, managedProjection and session bridge remain BLOCKED/OFF by **design, not deployed enforcement**. Actual Spring runtime SecurityFilterChain, gateway isolation, per-user/book/file ACL, KO secret-safe logging and SQLite faults remain Phase02/05/07 hard gates; full Hermes/NAS/device integrated E2E Phase09. No main/production changes. PR #2 integration merge is a separate action after exact HEAD CI and policy review.

---

## PHASE00 LATEST REVIEW-GATE EVIDENCE — 2026-10-29: INDEPENDENT PASS STILL REQUIRED

[GitHub Actions 40831672425](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40831672425) SUCCESS: 403/403 pinned Official method/path/verb source variants classified against ordered SecurityConfig source chain candidates; all 403 DENY gateway forwarding, not executable runtime Spring authorization. **348 mapping records but only 346 unique method names** due to overloaded BookCoverController#regenerateCovers and FileUploadController#uploadFile. Fixed source-key collision by using file + mapping line + handler. Exactly one representative matcher ambiguity for /api/v1/opds versus OPDS /** root; runtime decision NOT_RUN.

[GitHub Actions 40831960179](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40831960179) SUCCESS: machine [Phase00 gate integrity checklist](docs/implementation/phase-00/PHASE00-GATE-STATUS.json) verifies 923/923 SHA+AST, 15/15 source constants, 43/43 auth source triage with 0 authorized, 348/348 source handler records, 403/403 route candidates, 160 inheritance flags, 65 repositories, 109/109 static fixture definitions, unmodified independent review report. It correctly enforces **contractLocked=false and phase01Authorized=false** pending real proof.

[Fresh independent review request](docs/implementation/phase-00/PHASE00-FRESH-INDEPENDENT-REVIEW-REQUEST-2026-10-29.md) requires a separate reviewer to determine whether a Phase00 design-only contract can accept deferral of runtime Gateway/Spring/log-sink/authorization tests to Phase02/05/07/09, or whether NEW-P0-01 remains an independent Phase00 blocker. **Reviewer not yet run.** Existing verdict **CHANGES_REQUIRED / CORRECTION_INCOMPLETE / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** remains. Do not merge/deploy/unblock Phase01 or sensitive features. Older historical checkpoints below remain historical.

---

## 2026-10-29 — AUTHORIZATION SOURCE REVIEW 43/43 STATIC_CLOSED; SECURITY GATE REMAINS BLOCKED

**Source-level Authorization Review:** [CI 40830006159](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40830006159) SUCCESS verifies **43/43 prioritized no-local-annotation mutating handler source dispositions** (all controller/method positions and pinned supporting service witnesses, zero missing). Implementer triage: **6 CRITICAL / 29 HIGH / 4 MEDIUM / 4 LOW**, not CVSS/exploit confirmation. **ZERO of the 43 may be forwarded / approved**; 348 handlers remain documentary deny-by-default pending precise runtime chain and per-book/user authorization. [Full source finding and gate receipt](docs/implementation/phase-00/PHASE00-AUTHORIZATION-REVIEW-43-STATIC-DISPOSITION-2026-10-29.md).

**New risk source flags:** mutable request token stored on KoboController singleton-like field; nested file ID progress not visibly bound to requested book; KO book hash not visibly checked against current user library/content; Magic Shelf public-create privilege absent in inspected creation branch; Kobo path/body entitlement mismatch; race safety of public first-admin setup unproven; KO registration request body/header log disclosure risks. No production exploitation asserted. Added 6 synthetic regression contracts: **109/109 fixtures STATIC_PASS in [CI 40830218540](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40830218540)**; actual Gateway/mock HTTP/log-sink/concurrency/SQLite tests **NOT_RUN**. Preserve earlier 923 Java AST/SHA, 403 static route declarations, 15/15 symbolic source constants, 160 classified inheritance files as source evidence, not runtime gates.

**Phase status remains CORRECTION_INCOMPLETE / CHANGES_REQUIRED (prior independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** NEW-P0-01 BLOCKED; no independent re-review, no PR merge/deploy/production or Phase01. Previous checkpoint counts (103 fixtures, 43 unreviewed source dispositions) below are historical.

---

## LATEST VERIFIED PHASE00 CHECKPOINT — 2026-10-29 (IMPLEMENTER SOURCE ONLY)

[CI 40828172115](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40828172115) SUCCESS: 923/923 pinned Java bodies SHA+AST; 348 source method handlers/403 declared method-path-verb variants (NOT runtime route count); 15/15 source constants. **160 lexical extends/implements files now classified by source AST**: 65 repository types, 49 service types, 10 security filter/interceptors, 9 model, 7 task, 7 converter, 11 other, 2 Web configuration. **0 direct method-mapping files** among those 160, yet inherited/alternate semantics remain NOT_PROVEN. Full pinned 923-file + Gradle scan found no Spring Data REST source symbols or direct dependency declarations, narrow source indicator only, NOT no-REST runtime proof.

**Critical KO logging source risk:** Registration handler logs incoming userData map at WARN; Official request logging config includes payload (10k limit) and headers but excludes neither x-auth-user nor x-auth-key by name. Actual output depends on runtime logger/chain, NOT_RUN. Added 2 synthetic KO payload/header log-sink fixtures; **103/103 fixture definitions static PASS**, actual HTTP/Gateway/log-sink tests NOT_RUN. [Detailed pinned source receipt](docs/implementation/phase-00/PHASE00-INHERITANCE-AND-KO-LOGGING-TRIAGE-2026-10-29.md). Other 348 authorization owners still DENY_BY_DEFAULT, 43 mutating handlers require ACL, 9 call chains/37 source witnesses verified only narrowly.

**NEW-P0-01 BLOCKED, CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED**. PR #2 remains Draft, no merge/deploy/Phase01. Earlier counts (101 fixtures / unclassified 160) in historical sections below are superseded. This is not independent approval.

---

## LATEST IMPLEMENTER PROOF — 2026-10-29, Phase00 REMAINS SECURITY-BLOCKED

[CI 40821817455](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40821817455) SUCCESS (source/static only): **923/923 pinned Java contents Git-SHA/AST-verified, 348 method handlers, 403 static method/path/verb declarations (NOT runtime routes)**. All **15/15 symbolic mapping constant expressions** have exact value evidence: 9 from pinned Official OpdsController, 6 from locked spring-web 7.0.9 and pinned Spring Framework MediaType source SHA. Source-only value interpretation is complete; Spring runtime classpath/matcher NOT_RUN.

**348 source authorization ownership entries remain deny-by-default**, with **43 mutating handlers without local annotation** requiring global/service/record checks. **9 sensitive call chains / 37 source witnesses** validated in pinned Official; only narrower library-ID/user-record source checks are proven, current content revocation and complete gateway entitlement are NOT. **160 lexical inheritance/interface files** remain scope-review flags; **101 synthetic fixture definitions** pass static validation, all actual mock HTTP/SQLite/Gateway tests NOT_RUN. [Full source receipt](docs/implementation/phase-00/PHASE00-PINNED-SOURCE-SEMANTIC-ACL-RECEIPT-2026-10-29.md).

**NEW-P0-01 remains BLOCKED; CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** Feature HEAD before documentation sync `e052e9223a72785dc0ca16989c46db1547c132ac` (fetch live after commit). PR #2 Draft/Unmerged, no official backend exposure, no main/integration edits, no Phase01. Prior checkpoints below are historical, particularly 97 fixtures and 15 symbolic conditions being unresolved.

---

## LATEST VERIFIED STATIC EVIDENCE — Phase00 Route Semantics, 2026-10-29 (NOT Independent Approval)

[CI run 40819253130](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40819253130): pinned 923/923 Java bodies SHA-verified and AST parsed (0 errors), 64 Controller markers, 63 class +348 method =411 mapping annotations, **403 static method/path/verb declarations (not runtime route count)**. All method paths resolved; **15 symbolic consumes/produces conditions** still require semantic resolution. **223 security annotation signals**, **15 programmatic** and **2 framework-type signals**; **43 mutation handlers without local annotations** require global/service ACL investigation (not proof of unauthenticated access).

**101 security fixture definitions** (97 prior +4 WebSocket/static), static validator zero failures, every actual security/mock HTTP/SQLite test NOT_RUN. [Source auth audit](docs/implementation/phase-00/SOURCE-ROUTE-SEMANTIC-AND-AUTH-REVIEW-2026-10-29.md) has pinned SecurityConfig chain evidence. SOURCE_ANNOTATION_COMPLETE=false; RUNTIME_ROUTE_COMPLETE=NOT_RUN; NEW-P0-01 BLOCKED. CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED; no PR merge. Older checkpoints below are historical and superseded only as to 859 unread bodies and 97 current fixtures.

---

## CURRENT EVIDENCE — 2026-10-29 pinned full Java body scan (implementer, NOT reviewer approval)

**Verified static CI:** [Actions run 40817012499](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40817012499) and [source evidence commit](https://github.com/0xstillb/Grimmlink-Next/commit/0b6fef1002c8a86fa5e15a2c416c16ff1b64ae9a). All **923/923** pinned Java bodies were read, SHA checked and AST parsed, **0 errors**. Exactly **64 Controller markers, 348 method mapping +63 class mapping =411 mapping annotation occurrences**, NOT 411 HTTP routes. Additional **15 programmatic signals**, including WebMvcConfig static **/*** resource fallback, OPDS/Komga interceptors and WebSocketConfig **/ws** handshake; see [source mechanism reconciliation](docs/implementation/phase-00/SOURCE-WIDE-MECHANISM-RECONCILIATION-2026-10-29.md) and [per-file ledger](docs/implementation/phase-00/JAVA-SOURCE-WIDE-CENSUS.json). (Links here are relative to docs/implementation for documents in that directory; Phase00 files use local equivalents.) **97 fixtures** static validated, zero static failures, all actual negative tests **NOT_RUN**.

**IMPORTANT:** prior statements describing 859 unread Java bodies are historical and superseded *only as to content-read coverage*. The source has **161 files with lexical inheritance/semantic questions**; 348 method mappings, aliases/conditional/proxy, WebSocket/static, gateway auth ownership and Spring runtime evidence are **NOT yet contract complete**. `SOURCE_ANNOTATION_COMPLETE=false`, `RUNTIME_ROUTE_COMPLETE=NOT_RUN`. **NEW-P0-01 remains P0 BLOCKED**. Historical Independent verdict **CHANGES_REQUIRED** unchanged. **CORRECTION_INCOMPLETE / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED**. Do not self-approve/merge PR #2, start Phase 01 or expose Official backend. Feature gates for personal writes, native KO progress, metadata apply and session outbox remain OFF/BLOCKED.

## CURRENT — Phase00 Final Security Correction Checkpoint (2026-10-29; implementer, not independent approval)

Start `1370f9f38482af1442a3ecd7570e7dbbc4ac3bdd` (independent report commit); independently reviewed immutable HEAD `9682f9ce9305ea5242af82418bec7e504bf1ca03` is distinct; fixture/security-design correction commit `496681b307dd71fefedb649d951079557dc431f9`. **97 synthetic fixture definitions (70 original + 27 added, 11 modified); all execution NOT_RUN**. See [final correction report](docs/implementation/phase-00/FINAL-SECURITY-CORRECTION-2026-10-29.md), [KO contract](docs/implementation/phase-00/KO-CREDENTIAL-GATEWAY-CONTRACT.md), [App ACL](docs/implementation/phase-00/APP-AUTHORIZATION-MATRIX.md), [Phase acceptance](docs/implementation/phase-00/CONTRACT-LOCK-ACCEPTANCE-CRITERIA.md). **NEW-P0-01 remains P0 BLOCKER**: 923 Java files in pinned tree but only 64 named controllers/348 annotations previously read, full remaining source-wide audit not completed; runtime Spring routes NOT_RUN. NO SOURCE_ANNOTATION_COMPLETE claim. KO logging mitigations are DESIGN_SPECIFIED, not deployed; metadata/session post-send fixtures now use UNKNOWN remote mutation. Native KO progress, metadataApply, personal bridges, resets and session writes BLOCKED/OFF (design-only). **Independent verdict remains CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** PR #2 Draft / do not merge; full E2E Phase09 only.

---

## CURRENT PHASE00 — IMPLEMENTER ROUTE/SECURITY CORRECTION (2026-10-29)

Phase00 only; read `docs/implementation/phase-00/NEXT-INDEPENDENT-REVIEW-PACKET.md` before new independent review. Recognized 64 named controllers / 348 mapping annotations, full source+runtime completeness unverified. All sensitive feature gates remain blocked/design-only. PR #2 Draft to integration; NEVER merge, modify main, or approve Phase01. No real E2E until Phase09. Historical reviews immutable.

# Repository Agent Instructions — GrimmLink Next

> [Latest security remediation](docs/implementation/phase-00/SECURITY-REMEDIATION-2026-10-29.md): R-02A new P0, 56 source controllers/321 annotations; Native KOSync + personal reset routes BLOCKED/OFF, no review approval.

**Audience:** Codex CLI / AI implementers / independent reviewers. These are project constraints, not a claim of implemented features.

## Priority of instructions

1. Current explicit user decisions.
2. Approved [Notion Technical Spec v0.3](https://app.notion.com/p/407c7efbc00981f1a9c6ccb0de5d6a54), [AI Playbook v1.0](https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0), and [Upgrade Runbook](https://app.notion.com/p/407c7efbc0098105b492d0a7cca31bff).
3. This repository's verified CONTRACT/DECISIONS and currently pinned API source evidence.
4. Older Python Adapter or fork code **as behavioral reference only**.

Do not assume the CLI has access to Notion. Use links or approved local snapshots; if relevant source content is unavailable, record VERIFY/BLOCKED instead of inventing details.

## Mandatory invariants

- Never patch, fork-maintain, or depend on changes to Grimmory Official or Readest Official; do not modify KOReader or CrossPoint firmware.
- **No Full OPDS** membership reconciliation for Readest; native add-only OPDS is accepted.
- Host publishes one port **6060** through a gateway; internal container ports may differ.
- NAS book sources are read-only for Adapter; NETWORK mode for Grimmory. Never repack/rename/remove EPUB/PDF/OPF.
- OPF primary and safe Official REST metadata update: explicit `replaceMode=REPLACE_WHEN_PROVIDED`, respect locks, never use silent `REPLACE_ALL`.
- Sidecar optional inspect/fallback/import/backup/restore; adjacent NAS writes OFF by default.
- Official is personal-data owner. Never write its DB directly or use an admin identity to impersonate reader accounts.
- Retain raw native positions; use proven XPointer ↔ EPUB CFI with EXACT/CHAPTER_ONLY/UNRESOLVED. Never fake CFI, percent, Book Identity, HTTP success or test evidence.
- **Manual READ is not guaranteed preserved**: Native KOSync may reset status to UNREAD for progress <0.25%. Never fabricate a percent or silently compensate via REST. Official Continue Reading at 0.0% also has accepted limitations.
- Typed API contracts and safe error codes, bounded retries, idempotent queue, durable job/receipt records.
- Pino structured logging and diagnostics required; redact secrets, book text, highlights and personal notes; debug TTL max 30 minutes, trace TTL max 5 minutes.
- Watch upstream updates, pin versions and manually approve production updates; no auto-upgrade.

## Phase and testing boundary

- PHASE 00–08: implement and review source, compile, lint, unit, mocked contracts, isolated fixtures and static security tests.
- **PHASE 09 ONLY:** full integrated E2E, actual NAS/Hermes, physical KOReader/Readest/X4 Pro devices, migration/rollback drill and final production acceptance.
- Do not claim PHASE 00–08 = E2E PASS. No full E2E tests or production cutover before PHASE 09.
- Every phase must include real file changes and evidence; an approved document is not equivalent to an implemented feature.

## Git workflow

- Preserve `main`; do not merge automatically. Start on `feat/next-phase-XX` (or documented equivalent).
- Commit only scope-relevant changes; use a draft PR when ready for review.
- Review actual diff with an independent model/context. State file:line defects, real test commands and exit codes.
- Handoff: `docs/implementation/phase-XX/RESULT.md`, `HANDOFF.json`, `REVIEW.md`.
- Do not invent SHA, PR link, test output, source tags or deployed configuration. Unknown = VERIFY.

## PHASE 00 kickoff

Read [docs/implementation/phase-00/START-HERE.md](docs/implementation/phase-00/START-HERE.md), [independent REVIEW.md](docs/implementation/phase-00/REVIEW.md), and [implementer REMEDIATION.md](docs/implementation/phase-00/REMEDIATION.md). Phase00 source audit and correction docs exist, but **independent verdict CHANGES_REQUIRED remains**, re-review pending, NOT CONTRACT_LOCKED; design flags are not runtime implementation.

## GPT Web-First workflow — current execution policy (2026-10-28)

**Primary working interface:** ChatGPT Web GPT-6 with connected GitHub + Notion tools. Independent fresh GPT-6 review session for high-risk phases; Codex CLI may be used as an optional implementation runner, not a prerequisite.

**Every NEW session MUST:**
1. Fetch the live target repo `0xstillb/Grimmlink-Next`, inspect default branch, working branch HEAD and any open phase PR; don't infer state from memory.
2. Read `docs/implementation/ACTIVE-SESSION.json`, `SESSION-HANDOFF.md`, `COMMIT-POLICY.md`, `CONTRACT.md`, `PHASE-MATRIX.md`, `API-INVENTORY.md`, `UPSTREAM-MANIFEST.json` and the corresponding Notion Phase page/Playbook.
3. Check the actual phase status, unresolved blockers and last committed files; read `RESULT.md`, `HANDOFF.json`, `REVIEW.md` for the last phase **if present**; missing files mean not complete.
4. Pick one phase and one branch; implement within phase scope, never merge to `main`. In Phases 00–08, only unit, static, schema, mocked contract/fixture checks; full E2E and real devices reserved for 09.
5. **Commit source changes and handoff files to GitHub** after coherent work. Update Notion phase status, commit links and exact SHA **after** GitHub confirms the commit, and read it back.
6. If blocked mid-session, still commit truthful checkpoint (no fake DONE), record remaining work and next command in active handoff; do not claim code ran unless it did.
7. If GitHub/Notion connector denies write, report explicitly and provide a copyable change/patch, never claim a commit was made.

Follow `docs/implementation/COMMIT-POLICY.md` for commit and PR gates and `docs/implementation/SESSION-BOOTSTRAP-PROMPT.md` for resuming work.
