> **Effective 2026-10-30:** [Single-Owner Private Policy](SINGLE-OWNER-POLICY.md) supersedes old per-phase independent reviewer requirements. No mandatory independent security review in Phase00–08; one consolidated review and remediation in Phase09. Existing historical signed review records must not be rewritten.

# Git Commit, PR & Phase Gate Policy — GPT Web-First

**Project:** https://github.com/0xstillb/Grimmlink-Next
**Canonical plan:** https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0
**State:** Accepted workflow policy; not evidence that Phase 00 has been implemented.

## Branch model

- `main`: immutable by agent until **Phase 09** has demonstrated Full E2E acceptance and the user explicitly authorizes release/merge.
- `integration/grimmlink-next`: shared integration target for phase PRs; base starts from current `main`. It is not production. Merge changes to integration only after user approval or an explicit delegated workflow.
- `feat/next-phase-00` through `feat/next-phase-09`: new branch for each phase based on the last approved integration HEAD, not a stale `main` branch. If work requires code on earlier feature branch before integration, record exact source HEAD and dependency.
- `fix/phase-XX-<topic>`: narrow fixes; `docs/<topic>`: documentation-only changes. Do not force-push or rewrite history without explicit approval.
- Create PR `feat/next-phase-XX` -> `integration/grimmlink-next`; keep as **Draft** while in progress. No auto-merge to `main`.
- On GitHub Web/API, case-sensitive repo is `0xstillb/Grimmlink-Next`.

## Required Commit Rules

Use conventional commits with phase scope:
- `docs(phase-00): record verified official API inventory`
- `feat(phase-01): add typed Fastify app and durable SQLite schema`
- `feat(phase-06): implement verified xpointer cfi bridge`
- `test(phase-07): cover session event idempotency`
- `fix(phase-03): preserve locked metadata fields`
- `docs(handoff): checkpoint phase 03 work and blockers`

Commit atomic, reviewable changes, not a huge uninspectable end-of-phase batch. For each coherent implementation change: update code + relevant unit/mock fixture + docs and commit on that phase branch. Never invent test output or commit hash.

**Checkpoint at every session end, interruption, blocker, or context transfer:**
1. Re-fetch real branch HEAD before any write and confirm branch identity.
2. Record exact changed files, why, runtime/API assumptions, completed vs pending, test commands and actual exit code (or NOT_RUN), known bugs, safety state, next action.
3. Update `docs/implementation/SESSION-HANDOFF.md` and `ACTIVE-SESSION.json` in the SAME commit as the checkpoint when possible.
4. For phase development completion (00–08), write `phase-XX/RESULT.md` and `HANDOFF.json` with evidence and deferred risks. `REVIEW.md` is optional developer notes, not an independent acceptance gate. One independent security review + remediation belongs to Phase09. Never create fake APPROVED reviews.
5. Confirm GitHub server commit SHA, PR head SHA and branch after the write. Then update Notion Phase page with the confirmed SHA/PR plus status; never reverse this sequence.
6. If Notion update fails, GitHub checkpoint is canonical; mark `NOTION_SYNC_PENDING` and reconcile next session.

**Do not store the commit SHA of a file inside that same commit** (self-referential hash problem). `ACTIVE-SESSION.json` declares expected branch/phase and last verified prior commit; always query live HEAD as canonical.

## Gate rules — Single-Owner Private

| Gate | Evidence | Allowed state |
| --- | --- | --- |
| Planned | Phase plan | PLANNED |
| Implementation in progress | Commit + tests pending | CODE_COMMITTED / IN_PROGRESS |
| Dev completion Phase00–08 | Actual unit/build/types/lint/mock tests, RESULT, HANDOFF, risk ledger | DEV_CHECKS_PASS_WITH_DEFERRED_RISKS |
| Real feature exposure | Functional authentication and security proof for the enabled route | ENABLEMENT_VERIFIED or BLOCKED_OPERATIONAL_ENABLEMENT |
| Phase09 | One independent review + fixes, full Hermes/NAS/readers E2E, rollback | FINAL_SECURITY_VERIFIED or BLOCKED |
| Production | Phase09 acceptance + explicit owner authorization | RELEASED |

No independent reviewer signoff is needed to proceed to another **safe development** phase. Actual Official forwarding is still `DENY_ALL` until relevant runtime checks prove safe; unsafe feature activation is not authorized by a development gate. No full E2E before Phase09.

## GitHub connector execution

- Read with `get_repo`, `fetch`, `fetch_file`; create/update feature branches and files with GitHub write operations.
- Use server-confirmed commit SHA and verified branch tip; do not describe planned writes as committed.
- Before writing a known file, fetch blob SHA / branch HEAD to avoid overwriting concurrent work; stop on conflict and reconcile, not force-update.
- PR in Draft while review incomplete, no merge/close unless instructed.
- GitHub connector may not support local runtime or physical devices; unit/test execution is NOT_RUN if it did not actually execute.
- If using Codex CLI locally, `git status`/diff, run tests within phase allowance, commit/push the branch and confirm remote SHA.

## Change traceability

For every phase: Notion phase URL ⇆ GitHub phase branch ⇆ PR URL ⇆ reviewed commit SHA ⇆ handoff/receipt. Every PR links a checklist from the Notion phase. At phase boundary, update `ACTIVE-SESSION.json` with the next phase; include any blocked gates as unresolved, not passed.

## Never touch

Official Grimmory/Readest source/forks, source EPUB/PDF/OPF bytes, personal secrets, `main` without final authorization, Full OPDS, direct Grimmory DB writes. All Full E2E/real readers/NAS/Hermes checks in Phase 09.
