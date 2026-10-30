# Phase 03 — NAS RO + OPF/Cover (Single-Owner Private update, 2026-10-30)

**Forward policy:** [Single-Owner Private](../SINGLE-OWNER-POLICY.md) and [Phase 00–09 Matrix](../PHASE-MATRIX.md). This is a future-phase scope note, **NOT proof of implementation/completion**.

One owner. NAS input read-only, fixture/dry-run verification, safe file and cover mapping. No multi-user ACL or independent reviewer needed to begin/finish dev. Live metadata apply OFF pending safe real implementation. Final NAS/backup verification Phase09.

**Review cadence:** No independent/fresh-context security review is a Phase 03 development gate. Actual build/unit/mock tests and RESULT/HANDOFF required; unresolved risks entered in ../DEFERRED-SECURITY-LEDGER.md.

**Safety:** no anonymous privileged API, unsafe Official forwarding, production changes, or real-device E2E outside Phase09; future guarded features remain disabled until corresponding functional safety is proven.

## Delivered offline implementation checkpoint (2026-10-30)

[Stacked Draft PR #7](https://github.com/0xstillb/Grimmlink-Next/pull/7), based on Phase02 draft branch. Bounded Linux-local file reader with directory/symlink/hardlink checks and SHA256; UTF-8 OPF strict-subset scalar extraction, adjacent EPUB/OPF naming, exact manifest cover mapping and cover signature validation; isolated mock lock-aware sparse preview. No Official sessions or NAS production connector. No Sidecar export (Phase04), no transactional metadata writes, no new multi-user policy. See [RESULT](RESULT.md) and [HANDOFF](HANDOFF.json).

**Limits:** This is a fixture reader, not a proven read-only NAS mount, not openat2/dirfd-anchored rename-race prevention, not a complete XML parser (unsupported OPF constructs fail closed), and not an authenticated lock-aware Official mutation. Real integration, owner-only authorization, actual mounts/backup/rollback and final review remain Phase09.
