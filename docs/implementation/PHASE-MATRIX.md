# Development Phases / Gate Matrix

Source: [AI Development Playbook](https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0)

| Phase | Build | Permitted tests | Gate |
| --- | --- | --- | --- |
| 00 | Source audit, architecture, official API contract freeze | Static/document/source checks | CONTRACT_LOCKED |
| 01 | TypeScript workspace, SQLite, Pino, UI shell | Unit, typecheck, mocked components | FOUNDATION_REVIEWED |
| 02 | Gateway, Admin/device auth, Official REST client | Mock HTTP contracts + unit | GATEWAY_CODE_REVIEWED |
| 03 | NAS RO, OPF ingestion, safe metadata, cover | Unit + isolated fixture integration | OPF_CODE_REVIEWED |
| 04 | Sidecar, durable jobs, backups and recovery | Local SQLite + fake API/NAS | RECOVERY_CODE_REVIEWED |
| 05 | Identity, device pairing, native/managed KOSync | Digest fixtures + mock KOSync | SYNC_CODE_REVIEWED |
| 06 | XPointer ↔ CFI, PDF progress, Continue Reading | Golden EPUB fixture + mock Official | POSITION_CODE_REVIEWED |
| 07 | KOReader Lua plugin, shelf, ratings/bookmarks/annotations/sessions | Lua/unit + mock Official | PERSONAL_CODE_REVIEWED |
| 08 | Complete UI, diagnostics, update center, security, packaging | UI, unit, mocked contracts, SAST | RELEASE_CANDIDATE_READY_NOT_E2E |
| **09** | **All real E2E, Hermes/NAS, devices, faults, rollback and production release** | **Full real-stack E2E and acceptance only now** | **PRODUCTION_VERIFIED or BLOCKED** |

**Rule:** Phases 00–08 cannot claim system readiness or full E2E. All agreed features must be implemented by the end of Phase 08 and verified in Phase 09.

Each Phase delivers `docs/implementation/phase-XX/RESULT.md`, `HANDOFF.json` and `REVIEW.md`, with evidence and an independent review.
