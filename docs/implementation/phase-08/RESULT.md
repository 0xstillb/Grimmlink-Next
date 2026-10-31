# Phase 08 — Single-Owner Control Center, Diagnostics and Offline Packaging

## Reconciliation checkpoint — 2026-10-31 (IN PROGRESS)

The live integration base was fetched at `68b7d74daecdacc909ac095c86f6f95aed84ffe7`. On Draft [PR #13](https://github.com/0xstillb/Grimmlink-Next/pull/13), the Control Center navigation exposes 10 requirement areas: Overview, OPF Sync, Jobs, Identity, Reading, Sidecar & Restore, OPDS, Logs & Diagnostics, Settings & Devices, and Update Center. Missing live data is shown as unavailable; protected actions are disabled. Bounded, fixture-tested parsers cover GitHub stable release and published advisory payloads. They do not fetch feeds, establish compatibility or impact, authorize, download, or install an update.

Added a safe support-bundle preview built from the existing diagnostic allow-list. SHA-256 covers the canonical report JSON only. The one-hour expiry clears the in-page preview; text already copied to the clipboard cannot be revoked. This is not the authenticated server-side bundle, log collection, retention, or delivery flow in the complete Phase08 scope.

Added [PHASE09-ACCEPTANCE-PLAN.md](./PHASE09-ACCEPTANCE-PLAN.md) with staging-only acceptance scenarios, pass evidence and stop conditions. It is a plan and has not been executed.

**Local checks for the support-bundle checkpoint:** Control Center typecheck, 12 UI/diagnostic/release-evidence/support-bundle tests, changed-file Prettier and ESLint, Vite production build, Phase00 gate validator and Phase08 static policy scan passed. Corepack could not download pnpm in this network-restricted session, so these checks used the installed workspace binaries directly. With `TEMP`/`TMP` redirected to a workspace-writable folder, the Phase00 Python suite passed **57/57** during this checkpoint; its default Windows sandbox temp path had previously caused filesystem errors. The full Windows workspace Vitest run was **not green**: 181 passed and 26 failed across 45 files, including Linux-only fixture checks, POSIX SQLite permission checks, symlink permission failures and local loopback transport failures. The Phase08 package test's deterministic-manifest case passed, but its symlink-rejection case could not run because Windows returned `EPERM`. Full-repository Prettier check reports 84 existing files; changed files pass the targeted check. The preceding committed head `81a19c8` completed 10 successful GitHub Actions workflows, including Phase01 foundation and ARM64 image jobs. The support-bundle handoff commit requires its own exact-head Linux CI.

**Phase 08 remains open against the complete Notion scope:** the Pino redaction logger and in-memory DEBUG/TRACE lease primitive exist, but live log viewing, rotation/retention and authenticated UI control are not wired. The safe bundle preview is local-only and does not implement authenticated collection, server-side expiry, retention or delivery. Release/advisory payload parsing is fixture-tested, but feed transport, a reviewed compatibility manifest, impact classification and owner approval are not implemented. Existing auth/CSRF policies and API route factories are not mounted or integrated with these screens; production package/config/rollback hardening is incomplete. The Phase 09 test plan is present but unexecuted. Official forwarding remains `DENY_ALL`, protected writes remain `OFF`, and production is `NOT_AUTHORIZED`.

**2026-10-30 — DEV_CHECKS_PASS_WITH_DEFERRED_RISKS (offline only).** This is an isolated development handoff, not a runtime, production, or real hardware authorization. Branch feat/next-phase-08 stacked on Phase07 b1a2a042; Draft PR #12 targets Phase07. Integration remains Phase05 at 3b5321ed; main unchanged.

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

Verified code HEAD [3bd8fa2](https://github.com/0xstillb/Grimmlink-Next/commit/3bd8fa209857bab80054349f654cbfe5ba04c979): [Phase08 offline CI #41061321816](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41061321816) **SUCCESS**, including frozen install, SQLite rebuild, workspace build/typecheck/format/lint/all Vitest, offline package integrity, Phase00 historical safety/negative suite and static policy checks. Dependency advisory evidence was collected as a non-release gate, **not declared clean or independently audited**. Documentation closing commits still require separate exact-HEAD CI; no real Official/reader/NAS execution or production approval.
