# Phase 01 — Fresh-context independent technical review

**Date:** 2026-10-29 (Asia/Bangkok)  
**Reviewer:** GPT-6 in separate ChatGPT conversation; independently inspected live GitHub PR, code patches, and Notion Phase01 scope. This is **not** approval by a distinct human GitHub account.  
**PR:** https://github.com/0xstillb/Grimmlink-Next/pull/5 (OPEN / DRAFT / UNMERGED at inspection)  
**Exact reviewed source HEAD:** `7160eca857b9ee1daef425cc307bb6ad5fac8a25`  
**Base:** `integration/grimmlink-next` @ `4b4a924cf225734dab0d17114f878b5b1982d4a9`  
**Scope:** 81 changed paths, 41 commits; inspected full per-file changed-path/patch inventory, Notion Phase01 Definition of Done, Phase00 design-only lock, Phase01 handoff and major implementation, tests, workflow, container, persistence, observability, server, UI and fail-closed domain modules.

## Verdict: CHANGES_REQUIRED — FOUNDATION_REVIEWED NOT GRANTED

Phase01's exact reviewed HEAD has successful GitHub Actions for frozen install, build, strict typecheck, ESLint, isolated unit/mock tests and an ARM64-image/compose-policy build. These **do not** establish that all security and acceptance criteria pass. Findings below require corrections and new exact-HEAD review before phase closure.

### Finding P1-01 — Pino redaction rules omit deeper nested secret paths (HIGH)

- **Evidence:** `packages/observability/src/index.ts:41-49` protects top-level values and only one wildcard nesting level (`*.token`, `*.password`, etc.). Thus `context.auth.token`, `payload.user.password`, `headers.authorization` at root, and arbitrary secret-bearing log message strings are outside the specified redaction set. Pino redaction matches configured paths, not arbitrary-depth secrets (https://github.com/pinojs/pino/blob/main/docs/redaction.md).
- **Test gap:** `packages/observability/src/index.test.ts:35-49` exercises just one nested level plus serializer-specific request filtering; no multi-depth, case-variant, root-header or message-string canary.
- **Impact:** Generic structured logging API cannot support the Phase01 promise that secrets never reach a sink for all payload shapes. This is a **static policy vulnerability**, not proof of a secret having leaked in current runtime; real upstream transport remains disabled.
- **Required:** Narrow logging inputs to allowlisted safe fields / structured safe events; prevent raw user strings from being logged, and add sink-capture negative canaries for two/three-level nesting, root headers and string messages. Explicitly document that redaction alone is defense in depth.

### Finding P1-02 — Phase00 safety release gate accepts arbitrary values containing OFF (HIGH)

- **Evidence:** `scripts/phase-00/validate-phase00-release-gates.py:79-83` tests `"OFF" not in str(disabled.get(k,""))`; values such as `"ON_BUT_OFF_IN_NAME"` satisfy the guard, without being an approved disabled state. The validation file is changed by this PR and remains a prerequisite for Phase01 handoff integrity.
- **Test gap:** `scripts/phase-00/test_release_gate_integrity.py` tests `metadataApply="ON"` but not malformed mixed values containing `OFF`.
- **Impact:** False-green documentary design-only security gate if a malformed security status is inserted. This does **not** turn on a runtime gateway by itself, but violates fail-closed acceptance checks.
- **Required:** Enforce an exact allowlist of authorized disabled values per capability (or exact approved state map), and add adversarial negative tests for mixed/unrecognized values.

### Finding P2-03 — Backup and restore destination directories not validated as private (MEDIUM)

- **Evidence:** `packages/persistence/src/index.ts:72-86,96-108` calls `mkdirSync(parent,{recursive:true,mode:0o700})` but does not `lstat` or reject **existing** world-accessible or symlinked ancestor directories. By contrast, `openLocalStore` checks the immediate database parent at `index.ts:16-24`. Exclusive `0600` file creation is good, but does not make a shared directory private.
- **Impact:** The backup/restore path has a different local filesystem trust boundary than live DB creation. No exploitation was demonstrated; defense-in-depth gap.
- **Required:** Validate destination parent/ownership and symlink policy consistently (and define whether a trusted public parent is allowed); add negative fixtures for shared directories and symlinked directory paths, while preserving no-overwrite semantics.

### Finding P2-04 — Formatting and container runtime assertions need additional proof (MEDIUM)

- **Evidence:** `package.json:13-18` provides `format` but no non-mutating `format:check`; `.github/workflows/phase01-foundation.yml:27-38` runs ESLint but not Prettier. ARM64 steps at `.github/workflows/phase01-foundation.yml:47-57` build image and run `node -p process.arch`, but do not start `apps/adapter/dist/main.js`, healthcheck it, or boot SQLite in the image.
- **Impact:** Exact-head CI passing does not prove formatter conformance, ARM64 adapter boot, or that the container's read-only filesystem + mounted data work together. Does not imply these fail.
- **Required:** Add `prettier --check` to CI and an **isolated offline/no-upstream** ARM64 container smoke check for startup and health, optionally ephemeral local SQLite migration, maintaining the Phase01 prohibition on real Grimmory/NAS/device access.

### Finding P2-05 — Phase01 observability metrics contract remains unspecified (MEDIUM)

- **Evidence:** Notion Phase01 scope explicitly includes `metrics contracts` in task 4. `packages/observability/src/index.ts` defines logger, diagnostic lease, and safe diagnostic signal but no metric name/units/labels/schema contract. The UI correctly says no real metrics, but the specification asks for a **contract**, not fabricated counters.
- **Required:** Add minimal typed metric definitions and tests, or record an explicit scope-approved deferral in the Phase01 acceptance agreement. Do not add fake operational readings.

## Verified positive evidence (limited to inspected scopes)

- `apps/adapter/src/server.ts` only registers `/health` and `/openapi.json`; `packages/contracts/src/index.ts` limits `HOST` to `127.0.0.1`. No upstream forwarding or global debug HTTP toggle observed in inspected code.
- `packages/official-client`, `packages/sync`, and `packages/personal` are fail-closed, and `packages/identity` uses honest unverified `bookIdCandidate` semantics.
- `packages/persistence/src/index.ts` enforces private database file and immediate directory modes, transactional job claims, positive WAL backup/integrity checks and exclusive restore paths. Problems noted above are residual hardening, not denial of this positive code.
- UI renders truthful disconnected placeholders and semantic buttons. `App.test.tsx` uses SSR markup assertions; full keyboard/focus/contrast interaction remains **NOT independently executed**.

## External CI evidence at exact reviewed HEAD

- [Phase01 #40877287824](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40877287824): GitHub Actions **SUCCESS**; `foundation` and `arm64-image` jobs both completed successfully. Steps include frozen pnpm, SQLite native rebuild, build, typecheck, lint, unit/mock tests, QEMU ARM64 image build and network-none compose checks.
- [Phase00 static integrity #40877287798](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40877287798): GitHub Actions **SUCCESS** (design/source checks only).
- **Independent reviewer local CLI execution:** NOT_RUN (no local repo runner used); CI outcomes read directly from GitHub, not re-executed here.
- **Real integrated E2E / Hermes / NAS / physical readers:** DEFERRED_TO_PHASE_09 / NOT_RUN.
- **Runtime gateway/security/row-level ACL, KO and personal bridges:** BLOCKED / NOT_AUTHORIZED; Phase02/05/07 owners.

## Required next steps and release boundary

1. Implementer addresses P1-01 and P1-02 with regression tests; addresses or obtains an explicit, evidenced disposition for P2-03 through P2-05.
2. Run exact new HEAD CI (Phase01 and Phase00 gates) and maintain draft/unmerged. Re-review all corrective patches and resulting full-scope regressions in a new reviewer checkpoint.
3. Only then may a distinct accepted reviewer outcome be considered; **do not self-mark `FOUNDATION_REVIEWED`**, merge into `integration/grimmlink-next` or `main`, start Phase02, or enable Official forwarding. The previous Phase00 approval is design-only, not runtime security approval.

**This document records a review verdict on the pinned PRE-REPORT SHA. Writing this report creates a later docs-only HEAD; it does not retroactively convert the verdict or CI runs into approval of that newer commit.**
