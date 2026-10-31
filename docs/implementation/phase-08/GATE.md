# Phase 08 Gate — Adapter First, KOReader Plugin Second

## Execution order

Work one stream at a time. Finish the Adapter workstream and record its exact
source, checks, CI and handoff before changing the KOReader plugin. The plugin
workstream starts only after the Adapter gate passes. Do not mix plugin changes
into an Adapter closeout commit.

## Current status authority

The original Phase08 dashboard baseline was merged through PR #12. The current
offline reconciliation is carried by PR #13. In `ACTIVE-SESSION.json`, the
top-level Phase08 fields and `phase08Work.integrationMerge` are the historical
PR #12 receipt; `phase08Work.reconciliationCheckpoint` is the current Adapter
closeout checkpoint. The Phase00 validator checks both records. It validates
the shape of a recorded CI receipt; exact PR head and workflow conclusions must
still be checked live in GitHub.

## Adapter close gate

The Adapter workstream closes as
`DEV_CHECKS_PASS_WITH_DEFERRED_RISKS` when all of these are true:

1. The scoped Adapter and Control Center changes are committed to PR #13. Record
   that implementation commit as `sourceHead`.
2. Targeted tests, typechecks, lint/format checks and the Control Center build
   pass on the working source. Windows-only platform failures are recorded,
   not relabeled as passes.
3. All required GitHub workflows pass on the exact implementation commit in
   `sourceHead`. An older PR #13 pass does not count for newer code.
4. `RESULT.md`, `HANDOFF.json`, `ACTIVE-SESSION.json` and the deferred-risk
   ledger agree on the implementation source, gate status and next workstream.
5. Official forwarding stays `DENY_ALL`, protected writes stay `OFF`, Phase09
   E2E remains `NOT_RUN`, and production remains `NOT_AUTHORIZED`.

This is an offline development close only. Live providers, credentials, NAS,
Hermes, physical readers, production package signing and rollback are Phase09
work; they do not keep the Adapter development gate open.

## Stable handoff rule — no CI/documentation loop

`sourceHead` identifies the exact implementation commit that passed CI. After
that CI succeeds, one handoff-only commit may update `ACTIVE-SESSION.json`,
`phase-08/RESULT.md`, `phase-08/HANDOFF.json` and `SESSION-HANDOFF.md` with the
actual run IDs and final status. That documentation commit does not change
`sourceHead` or reopen the Adapter code gate. Confirm its diff contains only
those handoff files. Any code, test, workflow, lockfile or runtime-config change
after `sourceHead` reopens the gate and requires a new exact-source CI pass.
Record any final documentation-head CI readback in Notion; do not create another
commit just to copy those run IDs back into the same handoff.

## KOReader plugin gate

Start the plugin workstream only after the Adapter close gate passes. Give the
plugin its own changed-file list, tests, exact-head CI receipt and handoff. An
offline UI preview is not evidence of live sync. Device installation and
same-owner operations remain Phase09 tests.

## Staging and production gates

Staging requires a disposable Grimmory account, candidate versions, test
library, verified backup, read-only NAS fixture, owner-session configuration,
private ingress and test readers. Follow
`PHASE09-ACCEPTANCE-PLAN.md`; keep protected capabilities disabled until their
individual prerequisites pass.

Production remains `NOT_AUTHORIZED` until Phase09 scenario evidence is complete
at one candidate SHA, the consolidated independent security review and required
fixes pass, rollback is proven, and the owner explicitly approves release.
