# Phase 03 — NAS RO Fixtures, OPF Sparse Metadata & Cover (2026-10-30)

## Development delivery

**Disposition: `DEV_CHECKS_PASS_WITH_DEFERRED_RISKS` for OFFLINE development only.** Phase02 mock-only is stacked and still unmerged. Phase03 branch `feat/next-phase-03`, [Draft PR #7](https://github.com/0xstillb/Grimmlink-Next/pull/7) targets `feat/next-phase-02`, NOT integration or main.

**Verified code checkpoint:** `a00c3a0b4f15ae4340eba7143176fab435154672`; [Phase03 CI #41007830647](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41007830647) completed **SUCCESS** at that exact source HEAD: frozen pnpm install, workspace build/typecheck/lint/Prettier, full isolated unit tests (including Linux fixture FS). The final documentation/checkpoint commit must be separately checked for exact-HEAD CI; the previous PASS cannot be transferred to it.

## Implemented

- `@grimmlink/locations`: bounded Linux-only offline fixture file reads, lexical path and symlink/hardlink checks, non-following O_RDONLY open, /proc/self/fd readback, source identity/change recheck, SHA-256 fingerprint and hard byte caps.
- `@grimmlink/ingestion`: UTF-8 OPF strict XML-subset parser (DTD/external entity/PI refused), ten-scalar sparse metadata extraction with validation, duplicate scalar rejection and mock field lock omission, adjacent EPUB+OPF path mapping, explicit cover manifest identity and basic JPEG/PNG/WebP signature validation.
- `inspectOfflineBookFixture()`: local directory fixture dry-run only, EPUB/OPF/cover fingerprints and safe sparse preview. No network transport, login, metadata PUT, file delete or NAS writes.
- `.github/workflows/phase03-offline.yml`: frozen workspace CI, fixture unit/negative cases, historical Phase00 safety invariant verification. No live Official gateway.

## Remaining before operational enablement

1. Real NAS mount read-only enforcement and directory-handle `openat2`/equivalent race-free traversal, mount identity revalidation and migration scenarios. Current fixture code **does not prove** full TOCTOU absence.
2. Real Grimmory Official authenticated same-owner edit entitlement, server-trusted locks, CAS/revision conflict prevention, side effect handling, transactional readback. `metadataApply` remains `OFF`.
3. Full OPF compatibility including multi-namespace files and extended cover variants needs fixtures from real data before enablement. Unsupported XML constructs fail closed in this subset implementation.
4. Phase04 Sidecar/jobs/backups/restore, then Phase09 physical Hermes/NAS/reader integration, final one independent security review/remediation and owner release approval.

**Safety state:** gateway `DENY_ALL`; `metadataApply=OFF`; sensitive bridges `OFF`; production `NOT_AUTHORIZED`. One Official owner, multiple paired readers; no new RBAC. Do not merge either stacked PR or deploy without separate owner approval.

## CI

- Verified implementation SHA: `a00c3a0b4f15ae4340eba7143176fab435154672`.
- Verified code run: [41007830647](https://github.com/0xstillb/Grimmlink-Next/actions/runs/41007830647) **SUCCESS**.
- Final handoff SHA: **READ LIVE FROM PR #7**; require its own exact-HEAD evidence after this documentation commit.
