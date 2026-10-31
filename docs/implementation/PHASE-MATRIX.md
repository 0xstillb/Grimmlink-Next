# Development Phase Matrix — Single-Owner Private (effective 2026-10-30)

Canonical policy: [SINGLE-OWNER-POLICY.md](SINGLE-OWNER-POLICY.md). All independent security review and remediation is **deferred to Phase09**. Phases 00–08 advance on verified development checks and handoffs; no independent/fresh-context review gate. Old reviewed gate names remain historical evidence, not prerequisites.

| Phase  | Deliverable                                                         | Dev check (not independent review)                                                                     | Remaining work deferred                                        |
| ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 00     | Upstream source inventory, API/architecture                         | Pinned source/static checks, contract                                                                  | Actual runtime/network/production acceptance                   |
| 01     | TypeScript, SQLite, observability, UI shell                         | Build, typecheck, unit, isolated mock/ARM64                                                            | Final image/config security                                    |
| 02     | Single-port Gateway, owner session and API transport                | Fastify/Caddy mock, Spring route registry, negative tests                                              | Real Official proxy+auth/ingress; final security review        |
| 03     | NAS read-only, OPF metadata and cover                               | Offline fixtures, simulated NAS/API, dry run                                                           | Real NAS/Official writes and data integrity                    |
| 04     | Sidecar, jobs, backups, restore                                     | SQLite/crash/fake API tests                                                                            | Real backup/rollback on Hermes                                 |
| 05     | One-owner multi-device pairing, KOSync                              | Device/owner token tests, mock KOSync                                                                  | Real device pairing/revocation/KO race                         |
| 06     | XPointer↔CFI, PDF, Continue Reading                                | Golden EPUB and mock progress roundtrips                                                               | Actual multi-reader correctness                                |
| 07     | KOReader plugin UI, shelf, bookmark, annotation, ratings, sessions  | Lua/mock callbacks, deterministic offline package, personal API fixtures                               | On-device install and same-owner operations (Phase09)          |
| 08     | Control Center, logs/diagnostics, update center, package            | CI, mock integration, dependency/SAST evidence                                                         | Authenticated integration, real release/rollback and hardening |
| **09** | **Real full-stack Hermes/NAS/reader E2E, safety+rollback, release** | **ONE independent security review, fix all relevant findings, real tests and explicit owner approval** | **No outstanding critical deployment risks**                   |

Each intermediate Phase delivers `RESULT.md` + `HANDOFF.json` + tested commits. Developer notes/`REVIEW.md` optional in 00–08. Maintain [deferred security ledger](DEFERRED-SECURITY-LEDGER.md); no extra review signoff to move to the next safe development phase. **This does not grant permission to turn on Official forwarding, privileged writes or production:** unsafe features stay OFF until relevant runtime controls are proved; no full integrated E2E before Phase09, no merge to `main` without explicit owner approval.

## Reconciliation checkpoint — 2026-10-31

Phase08's prior offline dashboard/package was merged at integration `68b7d74`. Draft PR #13 adds a 10-section offline UI navigation and a Phase09 acceptance plan. This closes the navigation-shell gap only; Phase08 remains **IN PROGRESS** against the full Notion scope. Exact-head Linux CI is pending. The Pino logger and DEBUG/TRACE lease primitive exist, but the authenticated live log viewer/retention UI is not wired; the release/advisory watcher and approval flow are absent; auth/API factories remain unmounted; and production package/rollback hardening remains incomplete. Local Windows full-suite results are recorded in [Phase08 RESULT](phase-08/RESULT.md); they are not an all-green workspace claim.

Historical reports from earlier policies remain immutable and valid as records of what was actually reviewed.
