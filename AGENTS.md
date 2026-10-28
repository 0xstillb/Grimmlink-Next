# Repository Agent Instructions — GrimmLink Next

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
- Preserve manual status where appropriate; Official Continue Reading at 0.0% has accepted limitations.
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

Read [docs/implementation/phase-00/START-HERE.md](docs/implementation/phase-00/START-HERE.md). The current files are a **bootstrap scaffold**, not a completed Phase 00 audit.

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
