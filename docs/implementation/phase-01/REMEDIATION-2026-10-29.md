# Phase 01 — Implementer remediation following independent CHANGES_REQUIRED

**Date:** 2026-10-29 (Asia/Bangkok)  
**Independent review (preserved):** [REVIEW.md](./REVIEW.md), pinned reviewed HEAD `7160eca857b9ee1daef425cc307bb6ad5fac8a25`  
**PR:** https://github.com/0xstillb/Grimmlink-Next/pull/5  
**Post-correction code checkpoint before this documentation:** `d14a84d7bf1359e22846db6729fc4d6b6f060dd8`

This is **implementer remediation**, not a second independent approval and not `FOUNDATION_REVIEWED`.

| Reviewer ID | Corrective implementation | Regression evidence |
| --- | --- | --- |
| P1-01 (HIGH) | `packages/observability/src/index.ts` now applies a final allowlist to serialized Pino events **before writing any sink**, including nested objects, child bindings and untrusted string messages. Only fixed codes, numeric counters, controlled error types and safe literals may be emitted. Pino's path-based redaction remains defense in depth. | `packages/observability/src/index.test.ts`: nested token/password/secret, root Authorization header, free-form message and child-binding canaries |
| P1-02 (HIGH) | `scripts/phase-00/validate-phase00-release-gates.py` requires exact Phase01 disabled-state dictionary values, rejects unknown keys, and never accepts substrings containing `OFF`. | `scripts/phase-00/test_release_gate_integrity.py`: mixed `OFF` values, null, boolean and extra capability name negative tests |
| P2-03 (MEDIUM) | `packages/persistence/src/index.ts` walks local directory components without following symlinks and checks that the immediate SQLite parent is owner-controlled/private before creating backup, restore or live DB files. | `packages/persistence/src/index.test.ts`: 0755 directory, symlink to shared directory and symlink ancestor rejected; prior exclusivity and WAL fixtures remain |
| P2-04 (MEDIUM) | `package.json` adds `format:check`; Phase01 workflow enforces it. Existing workspace files were formatted with pinned Prettier 3.6.2, and the temporary write-permission formatter workflow has been deleted. Phase01 workflow also boots the isolated ARM64 adapter, tests its health over container-local loopback and opens a temporary private SQLite database/migrations, with `--network none`, `--read-only`, caps dropped and tmpfs state. | `.github/workflows/phase01-foundation.yml`; exact post-correction CI run must be inspected, not assumed |
| P2-05 (MEDIUM) | `packages/observability/src/metrics.ts` specifies fixed local metric names/types/units and low-cardinality module labels with numeric validation; no collectors or fake operational data. | `packages/observability/src/metrics.test.ts`: valid schema samples and invalid name/value/labels |

## Validation and nonclaims

- The Phase00 design-only release gate was observed SUCCESS on code checkpoint `d14a84d7bf1359e22846db6729fc4d6b6f060dd8`: https://github.com/0xstillb/Grimmlink-Next/actions/runs/40883141347.
- The corresponding Phase01 exact-code run was still PENDING when this remediation receipt was written: https://github.com/0xstillb/Grimmlink-Next/actions/runs/40883141411. **Do not label it PASS without live GitHub readback.**
- No independent reviewer has accepted the corrected diff or the later docs-only head.
- No real Official gateway, current book/user ACL, actual Hermes/NAS/readers, session bridging, production or full integrated E2E has been tested or authorized. Phase02/05/07 runtime security and Phase09 integrated E2E remain HARD gates.
- Historical Node base digest needs deliberate patch/CVE review for any production deployment.

## Next gate

Verify **exact latest PR HEAD** Phase01 and Phase00 CI, inspect failure logs if any, fix/regress as needed, and request a new independent exact-diff review. Until accepted, `FOUNDATION_IN_PROGRESS` / `CHANGES_REQUIRED`, PR DRAFT / UNMERGED, no Phase02 or sensitive feature enablement.
