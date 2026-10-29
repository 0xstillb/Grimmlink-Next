# Architecture Decision Records — Phase 00

**Architecture choices only; independent review CHANGES_REQUIRED and correction pending fresh review.** No deployed instance was contacted.

| ADR | Decision | Status / qualification |
| --- | --- | --- |
| ADR-001 | Stock Grimmory Official, stock Readest Official, maintained GrimmLink Lua; no upstream patch and no legacy DB migration | ACCEPTED |
| ADR-002 | TypeScript Fastify + SQLite/Drizzle + React static UI monorepo in this repository | ACCEPTED; Phase 01 implementation |
| ADR-003 | Gateway publishes only host :6060; preserve Official routes, exact prefix exceptions for KOSync and adapter | ACCEPTED; require proxy/auth/OPDS/Range/SSE fixtures |
| ADR-004 | NAS NETWORK, Adapter RO; preflight mount sentinel, fail closed on missing mount | ACCEPTED; verify Grimmory settings which can still write/move |
| ADR-005 | Adjacent OPF primary, ALL_BOOKS_WITH_OPF, immutable dry-run and Official API write only | ACCEPTED |
| ADR-006 | Force REPLACE_WHEN_PROVIDED, explicit empty-clear policy, locks and read-back; cover handled via separate multipart call | SOURCE-CONFIRMED route; behavioral staging in Phase 09 |
| ADR-007 | Sidecar retained for optional inspect/fallback/manual import/backup/restore; no routine NAS write | ACCEPTED; distinguish local backup from adjacent NAS JSON |
| ADR-008 | Default Native Official KOSync and per-user mapping; Managed mode only on evidence, never competing writers | ACCEPTED; final auth/hash race matrix VERIFY |
| ADR-009 | @prose-reader/koreader as conversion candidate, preserve native bytes & spine anchors; EXACT/CHAPTER_ONLY/UNRESOLVED | SOURCE-CONFIRMED signatures, correctness NOT E2E VERIFIED |
| ADR-010 | Continue Reading 0.0% Official UI is accepted limitation; no fake percent | ACCEPTED |
| ADR-011 | KOReader Lua personal push via per-user Official APIs with dedupe/queue; no server-only Readest personal hack | ACCEPTED; auth/idempotency still VERIFY |
| ADR-012 | No Full OPDS reconciliation, deletions or custom Readest shelf protocol; Readest auto-download add-only | ACCEPTED |
| ADR-013 | Full build phases 00–08 then Phase 09 only real Hermes/NAS/physical E2E and single final production release | ACCEPTED |
| ADR-014 | Pinned version manifest, upstream diff watcher, safe backups, manual update and rollback | ACCEPTED |
| ADR-015 | Implementation state separate from source evidence and actual runtime proof; each phase reviewed by separate fresh GPT context | ACCEPTED; Phase 00 review PENDING |

## Draft workspace layout (Phase 01 target, NOT created)
`apps/adapter` (Fastify API, KOSync coordinator, official client); `apps/control-center` (React); `packages/contracts` (versioned Zod/TS schemas); `packages/locations` (Prose adapter); `packages/opf`; `packages/persistence`; `packages/observability`; `infra/gateway`; `fixtures/contracts`; `docs/implementation/phase-XX`. Lua changes remain on separate GrimmLink plugin branch, referenced by pinned SHA. SQLite stores non-cache durable state on persistent volume, Grimmory Official retains authoritative data.


## Post-review ADR addenda (2026-10-29, design-only)

| ADR | Additional decision | Gate |
| --- | --- | --- |
| ADR-016 | Scalar-only OPF metadata default; skip all unapproved collection and lock fields; reviews can change independent of replaceMode | metadataApply OFF, Phase03 mocks |
| ADR-017 | Native KOSync is sole potential progress writer after entitlement; file-level CFI write is only attempted | managedProjection OFF |
| ADR-018 | Require caller-to-book library+content ACL proof, including Native KOSync hash and personal REST; never admin impersonation | KOSync/personal bridge OFF |
| ADR-019 | Native low-% status can reset manual READ: accepted source limitation, no invented percent | conflict-policy pending |
| ADR-020 | Global Sidecar isLocalStorage guard and independent move settings; NAS RO with no adjacent export | adjacentNasWrite OFF |
| ADR-021 | CFI EXACT only on same EPUB+spine+text-anchor round-trip; hashes must match actual files | Phase06 fixture; Phase09 real |
| ADR-022 | Readest can request registration after 401 but Official returns 403; pre-provision KOSync; OPDS add-only | Phase02/05 fixtures |
| ADR-023 | Correction pass cannot approve itself; prior CHANGES_REQUIRED stands | fresh review before CONTRACT_LOCKED or Phase01 |
| ADR-024 | External KOSync progress GET/PUT are deny-by-default before Official proxy; no alternative prefix/direct-port bypass. Require provisioned user-bound identity, exact hash/edition, assigned-library and content restriction prechecks for every request. | Phase02/05 design-to-code gate; no runtime enforcement in Phase00. If impossible without upstream changes, BLOCKED and OFF. |

[Evidence and R-01–R-12 trace](phase-00/REMEDIATION.md).
