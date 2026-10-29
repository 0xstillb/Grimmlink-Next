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
