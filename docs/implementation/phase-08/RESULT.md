# Phase 08 — Single-Owner Control Center, Diagnostics and Offline Packaging

## Reconciliation checkpoint — 2026-10-31 (IN PROGRESS)

The live integration base was fetched at `68b7d74daecdacc909ac095c86f6f95aed84ffe7`. On Draft [PR #13](https://github.com/0xstillb/Grimmlink-Next/pull/13), the Control Center navigation exposes 10 requirement areas: Overview, OPF Sync, Jobs, Identity, Reading, Sidecar & Restore, OPDS, Logs & Diagnostics, Settings & Devices, and Update Center. Missing live data is shown as unavailable; protected actions are disabled. Bounded, fixture-tested parsers cover GitHub stable release and published advisory payloads. They do not fetch feeds, establish compatibility or impact, authorize, download, or install an update.

Added a safe support-bundle preview built from the existing diagnostic allow-list. SHA-256 covers the canonical report JSON only. The one-hour expiry clears the in-page preview; text already copied to the clipboard cannot be revoked. This is not the authenticated server-side bundle, log collection, retention, or delivery flow in the complete Phase08 scope.

Added `SafeLogBuffer` to the observability package. It re-applies the final safe-line filter and keeps bounded in-memory entries with level, event-code and correlation-ID filters. Defaults are 500 entries, 1 MiB and 24 hours; hard caps prevent configuration above 10,000 entries, 8 MiB or 24 hours. It is not yet wired into the adapter process, authenticated routes or UI viewer, and it is not persistent.

Added an isolated diagnostics route factory for owner-authenticated safe-log read/filter/clear and DEBUG/TRACE lease status/enable/disable. Mutations require an injected CSRF verifier; the lease primitive still enforces the 30-minute DEBUG and 5-minute TRACE caps. This factory is not registered in `server.ts`, and its injected buffers are not connected to the running adapter or UI. The route tests use fake authorization callbacks only.

Added a bounded GitHub update-feed reader and owner-authorized isolated Fastify route factory in `apps/adapter/src/update-feed.ts`. Source IDs resolve only through startup configuration; URLs stay on `api.github.com`; requests are GET-only, omit credentials, reject redirects, enforce a five-second default timeout and a 1 MiB streamed response cap, and page at most 500 public advisories. The response drops download URLs and release notes and keeps compatibility UNKNOWN, impact UNCLASSIFIED, approval NOT_AUTHORIZED and installation disabled. The route factory is not mounted in `server.ts`; no live feed was fetched, and production owner-session/egress integration remains unverified.

Added [PHASE09-ACCEPTANCE-PLAN.md](./PHASE09-ACCEPTANCE-PLAN.md) with staging-only acceptance scenarios, pass evidence and stop conditions. It is a plan and has not been executed.

**Local checks for the diagnostics/feed checkpoint:** Adapter typecheck and **85/85 tests across 11 Adapter files**, observability typecheck and **14/14 tests across 2 files**, including the new isolated diagnostics route; targeted ESLint and Prettier passed for the changed implementation and test files. The Phase08 narrow static policy scan passed. Control Center typecheck/12 tests, Vite production build, Phase00 gate validator/Python suite (57/57) passed for the preceding offline checkpoint. Corepack could not download pnpm because registry DNS was unavailable, so checks used installed workspace binaries directly. The full Windows workspace Vitest run was **not green**: 181 passed and 26 failed across 45 files, including Linux-only fixture checks, POSIX SQLite permission checks, symlink permission failures and local loopback transport failures. The Phase08 package test's deterministic-manifest case passed, but its symlink-rejection case could not run because Windows returned `EPERM`. Full-repository Prettier check reports 84 existing files; changed implementation/test files pass the targeted check. The prior exact committed head `b49afc7` passed all 10 GitHub Actions workflows; this diagnostics-route commit still needs its own exact-head CI.

**Phase 08 remains open against the complete Notion scope:** the Pino redaction logger, DEBUG/TRACE lease primitive, bounded safe-log buffer, and isolated owner/CSRF-gated log/lease route factory exist. The buffer is not wired to the adapter, the route factory is not mounted, and the UI viewer/control and server retention configuration remain incomplete. The safe bundle preview is local-only and does not implement authenticated collection, server-side expiry, retention or delivery. A bounded GitHub feed reader and owner-gated route factory now exist, but that route is also unmounted, no live feed was requested, and the Update Center screen is not integrated. A reviewed compatibility manifest, evidence-based impact classification and trusted manual approval workflow are still missing. Other auth/API factories are not mounted or integrated with these screens; production package/config/rollback hardening is incomplete. The Phase 09 test plan is present but unexecuted. Official forwarding remains `DENY_ALL`, protected writes remain `OFF`, and production is `NOT_AUTHORIZED`.

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
