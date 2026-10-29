## CURRENT — Phase00 Final Security Correction Checkpoint (2026-10-29; implementer, not independent approval)

Start `1370f9f38482af1442a3ecd7570e7dbbc4ac3bdd` (independent report commit); independently reviewed immutable HEAD `9682f9ce9305ea5242af82418bec7e504bf1ca03` is distinct; fixture/security-design correction commit `496681b307dd71fefedb649d951079557dc431f9`. **97 synthetic fixture definitions (70 original + 27 added, 11 modified); all execution NOT_RUN**. See [final correction report](phase-00/FINAL-SECURITY-CORRECTION-2026-10-29.md), [KO contract](phase-00/KO-CREDENTIAL-GATEWAY-CONTRACT.md), [App ACL](phase-00/APP-AUTHORIZATION-MATRIX.md), [Phase acceptance](phase-00/CONTRACT-LOCK-ACCEPTANCE-CRITERIA.md). **NEW-P0-01 remains P0 BLOCKER**: 923 Java files in pinned tree but only 64 named controllers/348 annotations previously read, full remaining source-wide audit not completed; runtime Spring routes NOT_RUN. NO SOURCE_ANNOTATION_COMPLETE claim. KO logging mitigations are DESIGN_SPECIFIED, not deployed; metadata/session post-send fixtures now use UNKNOWN remote mutation. Native KO progress, metadataApply, personal bridges, resets and session writes BLOCKED/OFF (design-only). **Independent verdict remains CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** PR #2 Draft / do not merge; full E2E Phase09 only.

---

## CURRENT — 2026-10-29 Complete App Route & Security Contract Correction (implementer; pending independent review)

**Branch pre-correction HEAD:** `9eb7790367d2272e430ee78d2323952960234c00`; subsequent commits must be checked LIVE on [Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2). Prior independent verdict **CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** remains authoritative. **Recognized controller file census 64/348 method-level annotations** (56/321 root + 8/27 App; source annotation completeness across all Java and runtime mappings UNVERIFIED). [App census](phase-00/ROUTE-CENSUS-APP.md) · [Mapping expansion](phase-00/ROUTE-MAPPING-EXPANSION.md) · [Route ownership](phase-00/SECURITY-ROUTE-OWNERSHIP.md) · [Correction report](phase-00/ROUTE-COVERAGE-SECURITY-CORRECTION-2026-10-29.md) · [Reviewer packet](phase-00/NEXT-INDEPENDENT-REVIEW-PACKET.md).

**Feature gates (DESIGN_SPECIFIED, not runtime OFF switches):** `NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF`, metadata apply OFF, reset-progress/rating OFF, personal bridge reads/writes OFF, sessions bridge OFF. No atomic native KOSync ACL proof; Gateway precheck is not atomic; no zero-lost-update proof for Official metadata REST; session 202 is not immutable idempotent receipt. Runtime, unit/mocks, gateway, network and E2E NOT_RUN. Phase09 only full E2E/Hermes/NAS/devices. Do not merge PR #2, approve Phase01, or mark new findings independently APPROVED.

---
**New decisions (design only):** CENSUS: 64/348 named controllers not full Spring runtime; Komga 9×5 declaration, conditional GET preserved. GATEWAY: explicitly own all App personal methods and reset types, fail closed with no wildcard fallback. KO: strict Native atomic entitlement unavailable, remain OFF. METADATA: only 10 allowed scalars, no lost-update guarantee; OFF. SESSIONS: one transmission attempt, pre-send loss possible, UNCERTAIN cannot auto retry; OFF. Review gate remains CHANGES_REQUIRED.


## Latest Phase00 Security Remediation — 2026-10-29 (NOT independent approval)

**R-02A NEW P0:** Official `POST /api/v1/books/reset-progress` (BOOKLORE/KOREADER/KOBO) and `POST /api/v1/books/reset-personal-rating` require deny-before-upstream gateway coverage, current assigned-library/content eligibility for EVERY book ID, own-record eligibility and all-or-nothing mixed-batch rejection. Other sensitive routes include viewer-setting, shelves, notes v1/v2, PDF annotations, session reads/writes and KO profile. **56 source Controller files / 321 method-level annotations** inspected; runtime Spring mapping/aliases NOT_RUN. No generic sensitive fallback. **NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF**: precheck TOCTOU not atomic. `metadataApply=OFF`, `personalBridgeWrites=OFF`, `sessionsBridgeWrite=OFF`; design != executable enforcement. Historical **CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** unchanged; no merge or Phase01. Correction baseline `59773bd65eb265dbe4850204a65649b7c8a5c51c`, read LIVE HEAD for new commits.

[Security remediation](phase-00/SECURITY-REMEDIATION-2026-10-29.md) · [Full annotation census](phase-00/ROUTE-CENSUS-INDEX.md) · [ADR-025](ADR-025-NATIVE-KOSYNC-SECURITY.md)

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

## 2026-10-29 — Implementer final remediation addendum (NOT independent approval)

See [Phase00 field-level, route and retry contract](phase-00/FINAL-REMEDIATION-2026-10-29.md). LIVE source baseline: Grimmory `402e89b4452f8e2b17ab95f16c1621c003516cd2`, Readest `3cc39ad7a558e6612e1a8135058fbd6f3c90b3e3`. R-01 scalar-only allowlist and all unapproved collections omitted; R-02 KO user identity proven through same user's `/api/v1/koreader-users/me` plus own JWT but unclosed Native KOSync TOCTOU; R-09 UNCERTAIN outbox at-most-one dispatch; R-11 historical status separated. `metadataApply`, `unverifiedKOSyncPassThrough`, `personalBridgeWrites`, `sessionsBridgeWrite` remain OFF. No deploy/runtime claims. Independent verdict still CHANGES_REQUIRED, Phase01 unauthorized.

