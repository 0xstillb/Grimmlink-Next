# Architecture Decision Register

**State:** ACCEPTED USER DIRECTION; technical verification pending Phase 00.

| ID | Decision | Rationale |
| --- | --- | --- |
| D-01 | Use Grimmory Official; no upstream patches | Reduce maintenance |
| D-02 | Readest Official with native OPDS add-only and KOSync | No Readest fork or full shelf reconciliation |
| D-03 | Adapter TS/Fastify, React Control Center, SQLite | One maintained integration platform |
| D-04 | One host port 6060 and internal-only app ports | Network restriction |
| D-05 | NAS NETWORK / Adapter read-only | Protect book sources |
| D-06 | OPF primary via Official REST; Safe Replace, Cover ON if changed/valid | API-only ingestion |
| D-07 | Sidecar optional; inspection/backup/restore retained | Operational safety without routine write |
| D-08 | Native KOSync preferred; Managed mode only for proven gaps | Prevent duplicate ownership |
| D-09 | `@prose-reader/koreader` for XPointer↔CFI and digests, must validate | Avoid reimplementing conversion |
| D-10 | Reading State Bridge; accept Official 0.0% UI limitation | Do not fake progress |
| D-11 | Rating/Bookmarks/Annotations/Sessions via Official API, KOReader Lua plugin | Preserve authoritative personal store |
| D-12 | Clean start for old fork data; no database migration requirement | Reduce scope |
| D-13 | Full features built across phases; a single final release | User direction |
| D-14 | All full E2E and physical tests in Phase 09 only | User direction |
| D-15 | Debug/diagnostics and Upstream Update Center in complete build | Maintainability |

When a design conflicts with the pinned upstream behavior, **document the discrepancy** and obtain an explicit architectural decision. Never silently patch Official code or invent unsupported features.
