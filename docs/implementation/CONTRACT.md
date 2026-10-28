# Contract — GRIMMLINK NEXT

**State:** DRAFT / AWAIT PHASE 00 SOURCE AUDIT. Not locked. Last prepared: 2026-10-28.

## Authoritative specification

- [Technical Spec v0.3](https://app.notion.com/p/407c7efbc00981f1a9c6ccb0de5d6a54)
- [AI Development Playbook v1.0](https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0)
- [Upstream Compatibility Runbook](https://app.notion.com/p/407c7efbc0098105b492d0a7cca31bff)

This file records architectural constraints for the repository. It is intentionally **not** a claim that exact Official API requests, authentication, migrations, hashes, or deployed runtime behavior have been verified in the selected production tag.

## Non-negotiable contract

| Dimension | Requirement |
| --- | --- |
| Deployment | Grimmory Official, Readest Official, our TypeScript Adapter + KOReader Lua plugin |
| Exclusions | No upstream patches/forks, no Full OPDS, no migration of historical fork DB |
| Network | Only host port 6060 published; exact-path reverse proxy |
| Library | NAS NETWORK disk; Adapter read-only; mount identity checked before scan |
| OPF | Adjacent OPF primary, all-books scan, diff/dry-run/apply, checked locked fields |
| Safe metadata | Explicit `REPLACE_WHEN_PROVIDED`; absent source fields must never silently clear target |
| Cover | Separate validated multipart API call, source path/MIME/hash and Official readback |
| Sidecar | Optional inspect/backup/import/restore, default OFF for NAS writes |
| Reading | Native KOSync first, verified cross-reader location, single canonical writer |
| Personal | Official API, per-user/device-bound auth; stable event identity and duplicate prevention |
| Data | Durable SQLite outbox, job receipts and verified positions; no direct Official DB mutation |
| Observability | Request correlation, Pino JSON, audit, redacted bundles, timeboxed DEBUG/TRACE |
| Upgrade | Pinned release/image and compatibility gates; no unattended upgrade |
| Verification | Phase 00–08 static/unit/mock only; Phase 09 all real E2E and release acceptance |

## Pending source verification

See [API-INVENTORY.md](API-INVENTORY.md) and [UPSTREAM-MANIFEST.json](UPSTREAM-MANIFEST.json). PHASE 00 must verify against **target releases/tags**, not just `develop`/`main`, and record deviations before implementation. Do not use placeholders in production.
