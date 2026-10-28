## Scope

- Phase: `PHASE_XX`
- Playbook: https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0
- Source contract/handoff:

## Changes

Describe actual changed modules and behavior. List Official contracts affected.

## Safety Checklist

- [ ] No modifications to Grimmory/Readest Upstream or their forks
- [ ] Only Gateway :6060 public; no extra host port
- [ ] NAS book inputs remain read-only
- [ ] Metadata writes use explicit `REPLACE_WHEN_PROVIDED` and verify readback
- [ ] No fabricated CFI, percentages, hash matches or unsupported reader capabilities
- [ ] Personal events are user-scoped and idempotent
- [ ] Structured logs redact secrets and private reading content
- [ ] No Full OPDS reconciliation or old Fork DB migration
- [ ] No E2E or physical device tests before PHASE 09

## Tests Actually Run

| Command | Result/exit code | Evidence |
| --- | --- | --- |
| _fill from terminal output_ | _not run yet_ | _link/log_ |

## Required handoff

- [ ] `docs/implementation/phase-XX/RESULT.md`
- [ ] `docs/implementation/phase-XX/HANDOFF.json`
- [ ] `docs/implementation/phase-XX/REVIEW.md` from independent reviewer

**Phase 00–08:** state `CODE_REVIEWED_NOT_E2E_VERIFIED`, never `E2E_PASSED`. **PHASE 09:** full real-stack and physical E2E with documented evidence.
