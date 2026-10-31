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
PR #12 receipt; `phase08Work.reconciliationCheckpoint` is the current Phase08
workstream checkpoint, and its `adapterCloseout` is the frozen Adapter result.
The Phase00 validator checks the historical baseline and checkpoint shape.
Verify exact PR head and workflow conclusions live in GitHub.

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
4. `RESULT.md`, `HANDOFF.json`, `ACTIVE-SESSION.json` and `SESSION-HANDOFF.md`
   agree on the implementation source, workstream status and next action. The
   deferred-risk ledger agrees on unresolved risks and safety state; it is not
   a second source-head or CI receipt.
5. Official forwarding stays `DENY_ALL`, protected writes stay `OFF`, Phase09
   E2E remains `NOT_RUN`, and production remains `NOT_AUTHORIZED`.

This is an offline development close only. Live providers, credentials, NAS,
Hermes, physical readers, production package signing and rollback are Phase09
work; they do not keep the Adapter development gate open.

## Stable handoff rule — no CI/documentation loop

`adapterCloseout.sourceHead` identifies the exact Adapter implementation
commit that passed CI. After that CI succeeds, make one handoff-only commit
that updates `ACTIVE-SESSION.json`,
`phase-08/RESULT.md`, `phase-08/HANDOFF.json`, `SESSION-HANDOFF.md` and the
Phase09 acceptance plan's existing-Staging target note with the actual run IDs
and final status. Regenerate
`phase-00/PHASE00-GATE-STATUS.json` from the updated `ACTIVE-SESSION.json` in
that same commit; it is a derived receipt, not a second gate. The gate file may
be updated in that same documentation commit only to correct this handoff-file
list; final documentation-head checks validate the resulting set. These
documentation changes do not change `sourceHead` or reopen the Adapter code
gate. Confirm the diff contains only those handoff files, the Phase09 target
note, this gate-file list, and the generated Phase00 receipt. Any code, test,
workflow, lockfile or
runtime-config change after `sourceHead` reopens the gate and requires a new
exact-source CI pass. The final documentation-head CI must pass before starting
the KOReader plugin. Record that result in Notion; do not create another
commit just to copy those run IDs into the same handoff. A failed documentation
check permits a focused correction to the failing handoff file and a rerun; it
does not reopen Adapter code or request a new implementation pass.

Closing Adapter closes only that workstream. Phase08 remains
`IN_PROGRESS_OFFLINE_RECONCILIATION` while the plugin is being finished.

## KOReader plugin gate

Start the plugin workstream only after the Adapter close gate passes. Give the
plugin its own changed-file list, tests, exact-head CI receipt and handoff. An
offline UI preview is not evidence of live sync. Device installation and
same-owner operations remain Phase09 tests.

## Staging and production gates

The owner confirms the existing Staging machine is available and waiting for
code. After the KOReader plugin's exact-source CI and handoff pass, deploy the
candidate to that machine and run `PHASE09-ACCEPTANCE-PLAN.md`. Before any
state-changing scenario, verify the disposable Grimmory account, test library,
backup, read-only NAS fixture, owner-session configuration, private ingress
and test readers. These are execution checks on the existing Staging host, not
a request to provision another environment. Staging readiness and test
execution do not authorize production deployment.

Production remains `NOT_AUTHORIZED` until Phase09 scenario evidence is complete
at one candidate SHA, the consolidated independent security review and required
fixes pass, rollback is proven, and the owner explicitly approves release.
