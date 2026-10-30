> **Policy override, 2026-10-30:** [Single-Owner Private Mode](SINGLE-OWNER-POLICY.md). **No mandatory independent security review during Phase00–08.** The single consolidated independent review/fix pass is Phase09. Keep historical review findings as immutable records, not current development blockers; protected Official routes still remain OFF until actually safe to enable.

# GPT Web Session Bootstrap — Copy into a NEW Chat

Use this prompt every time you open a new ChatGPT Web session. First connect GitHub and Notion in the chat.

~~~text
Continue GRIMMLINK NEXT in GPT Web as a code implementation and review agent,
using connected GitHub + Notion. Do not rely on memories or prior assistant
completion claims when repository evidence is available.

Repository: https://github.com/0xstillb/Grimmlink-Next
Notion Master: https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0
Session Protocol: https://app.notion.com/p/407c7efbc009816ca3b1fe2b098e8c78
Draft Phase 00 PR: https://github.com/0xstillb/Grimmlink-Next/pull/1
Spec: https://app.notion.com/p/407c7efbc00981f1a9c6ccb0de5d6a54
Upgrade Runbook: https://app.notion.com/p/407c7efbc0098105b492d0a7cca31bff

FIRST:
1. Fetch live repo metadata, current feature/integration/main branches, head
   commits and open PR status from GitHub; report what actually exists.
2. Read repo AGENTS.md; docs/implementation/ACTIVE-SESSION.json,
   SESSION-HANDOFF.md, COMMIT-POLICY.md, CONTRACT.md, DECISIONS.md,
   API-INVENTORY.md, UPSTREAM-MANIFEST.json and PHASE-MATRIX.md.
3. Read the current phase page in Notion and review any prior
   phase-XX RESULT.md, HANDOFF.json, REVIEW.md, and actual GitHub diff.
4. Identify verified completed work vs merely planned/unverified.
   Summarize current phase, latest real head SHA, blockers, next work.
5. Execute ONE scope-safe task within the current phase using GitHub tools.
   Follow project rules and preserve main. Run only the tests for which
   tools/environment are actually available. Never invent tests.
6. COMMIT code/docs + update durable session handoff on the feature branch.
   Verify GitHub SHA/readback; then write the phase status, PR/commit link,
   next action, remaining blockers to Notion.
7. For final response report what was changed, exact file paths and commit/PR,
   tests actually run/not run, phase status and next prompt.

Do not ask me to repeat context already in the repo/Notion. Start the next safe development phase after actual code/tests and risk-ledger handoff; no independent review gate until Phase09. Do not merge to main.
Full E2E/real NAS/Hermes/physical readers ONLY in PHASE 09.
No Grimmory/Readest upstream patches, no Full OPDS, no fake CFI/progress.
If tool access is blocked, record precisely what remains uncommitted.
~~~

## Current entry point

PHASE 00 is PLANNED and code audit not yet completed. Next page: https://app.notion.com/p/407c7efbc00981e2b08ff8fb45c3f846

## Handoff Recovery

If Notion and GitHub disagree, treat the last verified GitHub commit/diff as proof of code, Notion as phase plan and task status. Report discrepancy; do not silently overwrite either source. If a session ended without a final handoff, inspect GitHub branch history, open PR, then reconstruct a truthful checkpoint using actual evidence.
