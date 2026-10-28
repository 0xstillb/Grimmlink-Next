# Session Handoff — GrimmLink Next

**Checkpoint date:** 2026-10-28
**Status:** BOOTSTRAP_COMMITTED — PHASE 00 NOT STARTED
**Canonical GitHub repo:** https://github.com/0xstillb/Grimmlink-Next
**Working branch:** `feat/next-phase-00`
**Production branch:** `main` (unchanged)
**Phase PR base:** `integration/grimmlink-next` (non-production)
**Live HEAD:** Always fetch current GitHub branch HEAD; this document is a checkpoint, not a live pointer.

## Read first (exact order)

1. [Live GitHub repository](https://github.com/0xstillb/Grimmlink-Next) and branch/PR HEAD; don't guess status from this note alone.
2. [ACTIVE-SESSION.json](ACTIVE-SESSION.json), [COMMIT-POLICY.md](COMMIT-POLICY.md), [AGENTS.md](../../AGENTS.md).
3. [CONTRACT.md](CONTRACT.md), [DECISIONS.md](DECISIONS.md), [API-INVENTORY.md](API-INVENTORY.md), [UPSTREAM-MANIFEST.json](UPSTREAM-MANIFEST.json), [PHASE-MATRIX.md](PHASE-MATRIX.md).
4. [Notion Master Development Playbook](https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0) and [PHASE 00 Prompt](https://app.notion.com/p/407c7efbc00981e2b08ff8fb45c3f846).
5. [Technical Spec v0.3](https://app.notion.com/p/407c7efbc00981f1a9c6ccb0de5d6a54) and [Upstream Upgrade Runbook](https://app.notion.com/p/407c7efbc0098105b492d0a7cca31bff).
6. Previous phase RESULT/HANDOFF/REVIEW if they exist; absence means status not confirmed.

## Current verified facts

- Owner `0xstillb`; public repository `Grimmlink-Next`; initial main files README/LICENSE/.gitignore, MIT.
- Feature branch `feat/next-phase-00` created from main and committed documentation-only Phase00 scaffolding. Previous verified scaffold commit: `f1b743517795d7775021c174b5ee126b9c554c6d`.
- No implementation code, no Official REST integration, no deployed Adapter, no Live NAS/reader E2E.
- PHASE 00 work is still to audit actual source and deployed target versions, freeze API/body/auth contracts and deliver reviewed source-based inventory; do not mislabel scaffold as done.
- Commit/PR rules and Web session continuity are being established in this checkpoint. Future sessions must inspect live branch/PR state.

## Scope locks

No Grimmory or Readest fork/upstream modifications; no Full OPDS; one port 6060; NAS RO; OPF primary safe REPLACE_WHEN_PROVIDED; Sidecar optional; real CFI evidence; KOReader Plugin user-bound personal events; full E2E **only Phase 09**.

## Next action (PHASE 00)

1. Start a new ChatGPT GPT-6 Web session with connected GitHub + Notion using [SESSION-BOOTSTRAP-PROMPT.md](SESSION-BOOTSTRAP-PROMPT.md).
2. Inspect the real source repos (Grimmory Official, Readest Official, Prose Reader, existing GrimmLink Lua, old Python Adapter).
3. Confirm which versions are installed on Hermes (if no access, mark UNKNOWN; don't assume). Populate API-INVENTORY and UPSTREAM-MANIFEST.
4. Create actual Phase00 RESULT/HANDOFF/REVIEW only after auditing sources and independent review.
5. Commit changes to `feat/next-phase-00`, update linked Draft PR, then sync exact SHA/status to Notion PHASE 00.

## Open blockers / unknowns

- No deployment/runtime/Hermes version and mount evidence verified.
- Actual Official target tag/DTO and auth scope not locked yet.
- No access confirmed to actual KOReader/Readest devices.
- GitHub connector write can commit files but does not run local tests; tests must be reported NOT_RUN unless executed elsewhere.
