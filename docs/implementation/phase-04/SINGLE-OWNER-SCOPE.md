# Phase 04 — Sidecar + Durable Jobs + Recovery (Single-Owner Private update, 2026-10-30)

**Forward policy:** [Single-Owner Private](../SINGLE-OWNER-POLICY.md) and [Phase 00–09 Matrix](../PHASE-MATRIX.md). This is a future-phase scope note, **NOT proof of implementation/completion**.

One-owner durable outbox, idempotency, SQLite, backup and recovery. Test local failures and simulated Official transport; no independent security review until Phase09. Preserve crash/rollback risks.

**Review cadence:** No independent/fresh-context security review is a Phase 04 development gate. Actual build/unit/mock tests and RESULT/HANDOFF required; unresolved risks entered in ../DEFERRED-SECURITY-LEDGER.md.

**Safety:** no anonymous privileged API, unsafe Official forwarding, production changes, or real-device E2E outside Phase09; future guarded features remain disabled until corresponding functional safety is proven.
