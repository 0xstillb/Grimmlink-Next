# Phase 08 — Single-Owner Control Center, Diagnostics and Offline Packaging

**2026-10-30 — CODE_IMPLEMENTED_CI_PENDING**. Exact-head CI must pass before this can be considered an isolated development handoff. Branch feat/next-phase-08 stacked on Phase07 b1a2a042; Draft PR #12 targets Phase07. Integration remains Phase05 at 3b5321ed; main unchanged.

## Delivered in source

- Responsive dark single-owner Control Center: Overview, Devices, Jobs, Diagnostics, Update Center, Settings. Explicitly marks disconnected/no real telemetry. No simulated activity, devices or fake update readiness.
- Local read-only status uses strict same-origin GET for three pre-existing adapter endpoints. Unknown or malformed health/capabilities/version yields disconnected state, never a false Official connection.
- Diagnostics exports a fixed allow-list of non-sensitive capability values. No headers, logs, tokens, owner IDs, books, reading notes or contents. Browser clipboard copy is direct user action.
- Update Center is **preview-only**; it cannot install, rollback, schedule or fetch an update. No new live/mutating server route.
- Deterministic hashed static UI preview manifest with strict path/type/size rules, symlink and suspicious-file rejection; deliberately marked NOT_AUTHORIZED and not installable.
- New unit/negative fixtures for local contracts, secret-safe export, package integrity, and historical Phase00 fail-closed transition to Phase08.
- New isolated Phase08 GitHub Actions: frozen dependencies, native SQLite, workspace build/typecheck/format/lint/all mock tests, local UI package manifest, limited static policy checks and non-gating dependency advisory evidence artifact.

## Not implemented and deliberately disabled

A real owner session/CSRF mutation path, live device/job diagnostics, actionable update delivery, signed production package, real upgrade/rollback, authenticated Official gateway, personal/sessions sync and Native KOSync. All protected operations stay OFF. No actual Hermes/NAS/reader E2E and no final release security clearance in this phase.

## Phase09 carry-forward

Trusted owner identity, real network/ingress/egress and Official ACL, secrets and diagnostics privacy, container/image/dependency findings, install signing and atomic rollback/health checks, actual hardware E2E, and **one consolidated independent security review/remediation and owner release approval**. Neither advisory scan nor isolated mock tests are a final security review.

## CI evidence

Current exact-head status: **PENDING**. Read the latest head SHA and the Phase08 workflow run before changing to DEV_CHECKS_PASS_WITH_DEFERRED_RISKS. Source CI and documentation closing commits require their own exact-head verification.
