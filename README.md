# GrimmLink Next

**Official Grimmory Integration · Multi-Reader Progress Sync · NAS OPF Sync · Local Control Center**

> **Status: planning / Phase 00 bootstrap.** This repository does not yet contain a working Adapter, tested API integration, or an E2E-verified deployment.

## Overview

GrimmLink Next is a new integration layer designed to use **Grimmory Official** as the library and personal-data backend. It will support KOReader (with our GrimmLink Lua plugin), Readest Official, CrossPoint TH / X4 Pro (within its native capabilities), and Grimmory WebReader.

The goal is to **maintain the Adapter and Lua plugin, not forks of Grimmory, Readest, or device firmware**.

| Area | Agreed architecture |
| --- | --- |
| Library | Grimmory Official; no upstream modification |
| Backend | Node.js / TypeScript / Fastify, SQLite for durable Adapter state |
| Dashboard | React + Vite, responsive local Control Center |
| Storage | NAS, Grimmory NETWORK mode, Adapter read-only mount |
| Metadata | Adjacent OPF primary → Official REST API, cover upload as a separately verified action |
| Backup | Sidecar read/fallback/import/backup/restore available, optional by default |
| Readers | KOReader + GrimmLink plugin, Readest Official, CrossPoint TH and Grimmory Web |
| Progress | Official native KOSync first; managed Adapter bridge only when required |
| EPUB positions | `@prose-reader/koreader` for XPointer ↔ CFI with evidence-based validation |
| Personal | Official Rating/Bookmark/Annotation/Session APIs, per-user authorization |
| Networking | Exactly one published host port, `6060` |
| Observability | Structured Pino logs, correlation IDs, durable receipts, optional scoped debug |
| Updating | Pin upstream versions; detect releases; check compatibility before manual upgrades |

**Out of scope:** Readest Full OPDS shelf reconciliation, Readest/Grimmory forks or upstream patches, legacy fork database migration, fabricated reading progress, and direct writes to Grimmory's database.

## Development Playbook

The project follows **PHASE 00–09** with a **single final production release**. Phases 00–08 are for code, static analysis, unit tests, mocked contract and fixture-level integration checks. **All full-stack E2E, real NAS/Hermes tests, physical readers, fault injection, and production acceptance are reserved for PHASE 09.**

- [Full-Build AI Development Playbook v1.0](https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0) — model/prompt assignments, phase pages, and handoff format
- [Technical Specification v0.3](https://app.notion.com/p/407c7efbc00981f1a9c6ccb0de5d6a54)
- [Upstream Upgrade & Compatibility Runbook v1.0](https://app.notion.com/p/407c7efbc0098105b492d0a7cca31bff)
- [PHASE 00 Prompt](https://app.notion.com/p/407c7efbc00981e2b08ff8fb45c3f846)

## Getting Started

1. Read [AGENTS.md](AGENTS.md) and [docs/implementation/CONTRACT.md](docs/implementation/CONTRACT.md).
2. Start with [PHASE 00](docs/implementation/phase-00/START-HERE.md) and inspect the upstream API implementation **before** assuming contracts.
3. Update the [API inventory](docs/implementation/API-INVENTORY.md) and [version manifest](docs/implementation/UPSTREAM-MANIFEST.json) using actually verified sources.
4. Work on feature branches. Do not merge to `main` or deploy before review and the PHASE 09 release gate.

**Bootstrap only:** The documents in this branch prepare the workspace. They are not evidence that PHASE 00 or any implementation Phase has passed.

## References

- Grimmory Official: https://github.com/grimmory-tools/grimmory
- Readest Official: https://github.com/readest/readest
- KOReader Plugin: https://github.com/0xstillb/GrimmLink
- Python Adapter (reference): https://github.com/0xstillb/grimmlink-adapter

License: MIT (see [LICENSE](LICENSE)).
