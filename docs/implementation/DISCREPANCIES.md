
## Latest Phase00 Security Remediation — 2026-10-29 (NOT independent approval)

**R-02A NEW P0:** Official `POST /api/v1/books/reset-progress` (BOOKLORE/KOREADER/KOBO) and `POST /api/v1/books/reset-personal-rating` require deny-before-upstream gateway coverage, current assigned-library/content eligibility for EVERY book ID, own-record eligibility and all-or-nothing mixed-batch rejection. Other sensitive routes include viewer-setting, shelves, notes v1/v2, PDF annotations, session reads/writes and KO profile. **56 source Controller files / 321 method-level annotations** inspected; runtime Spring mapping/aliases NOT_RUN. No generic sensitive fallback. **NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF**: precheck TOCTOU not atomic. `metadataApply=OFF`, `personalBridgeWrites=OFF`, `sessionsBridgeWrite=OFF`; design != executable enforcement. Historical **CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** unchanged; no merge or Phase01. Correction baseline `59773bd65eb265dbe4850204a65649b7c8a5c51c`, read LIVE HEAD for new commits.

[Security remediation](phase-00/SECURITY-REMEDIATION-2026-10-29.md) · [Full annotation census](phase-00/ROUTE-CENSUS-INDEX.md) · [ADR-025](ADR-025-NATIVE-KOSYNC-SECURITY.md)

# Phase 00 Discrepancy & Blocker Register

**Current 2026-10-29:** implementer correction pass pending independent re-review; the historical rows below remain for audit trail. Source-only audit. `BLOCKED` = cannot safely enable feature without resolving before implementation/use; `VERIFY` = follow-up confirmation. Do not promote phase to CONTRACT_LOCKED until fresh reviewer.

| Priority | ID | Status | Finding / evidence | Owner / safe next step |
| --- | --- | --- | --- | --- |
| P0 | C-001 | BLOCKED_FOR_UNGUARDED_WRITE | Metadata API default `replaceMode=REPLACE_ALL`; null fields may clear unless `REPLACE_WHEN_PROVIDED` set explicitly. [Controller](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/controller/MetadataController.java#L51-L59) | Phase 02/03: URL builder rejects absent mode, clearFlags whitelist; mock neg tests |
| P0 | C-002 | VERIFY | Actual installed Grimmory tag/image digest, DB migration version, existing proxy owner :6060 and NAS mount/sentinel are **UNKNOWN**; public release != deployed instance | Phase09 real environment inventory; before source-driven implementation use pinned v3.5.0 candidate only |
| P0 | C-003 | VERIFY | JWT login/refresh method and DTO are now source-verified (see API Inventory); refresh expiry units, role/permission mapping and per-user ownership remain UNVERIFIED; MD5 KOSync is not REST JWT | Phase 02: inspect auth controller/security/user linkage, deny impersonation |
| P0 | C-004 | VERIFY | NETWORK disk does NOT provide a blanket guarantee against Sidecar writes: writer uses Files.writeString when enabled, and move-on-update settings may move source files; [Sidecar writer](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/sidecar/SidecarMetadataWriter.java#L43-L80); [Updater code](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookMetadataUpdater.java#L97-L170) still calls sidecar writer/move routine based on settings | Phase 03/04: fail-closed settings preflight, isolate no-write tests; Phase09 read-only real verification |
| P0 | C-005 | VERIFY | KOSync hash→book lookup and user binding, remote concurrent overwrite/percent conversion not validated end-to-end; [KoreaderService](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java) can dual-write file progress | Phase 05/06: fixture-based identity and owner proofs, Phase09 real device |
| P0 | C-006 | BLOCKED_FOR_EXACT_PROJECTION | Prose converter API returns undefined on invalid spine; must verify DOM/spine anchors and Thai text; no fabricated EXACT or fallback to percent | Phase 06: golden fixtures then Phase09 physical E2E |
| P1 | C-007 | VERIFY | Official ReadingSessionRequest has no eventId; duplicate retries may create multiple sessions; POST 202 is not idempotency proof | Phase 07: adapter durable event ledger + readback, 202 not PASS |
| P1 | C-008 | VERIFY | Cover upload endpoint exists but mime/limits/persistence/cache-readback and locks need contract/fixtures; invalid covers may affect original thumbnails | Phase 03: positive and negative mocks, Phase09 safe readback |
| P1 | C-009 | VERIFY | Readest Official configured KOSync base URL needs exact `/api/koreader` prefix; gateway rewriting can cause double prefixes or auth leaks | Phase 02/05: route table and no-auth-bypass mocks; Phase09 apps |
| P1 | C-010 | ACCEPTED_LIMITATION | Readest OPDS auto-download is not two-way shelf membership nor automatic deletion | Preserve add-only, no custom protocol |
| P1 | C-011 | VERIFY | OPDS feed auth/shelf paging/acquisition URL behind single gateway and local TLS specifics unverified | Phase 02 mocked feed/proxy; Phase09 physical read |
| P1 | C-012 | VERIFY | Upstream DB migration and restore/rollback steps untested; moving image tag backwards cannot replace DB restore | Phase08 manifest/runbook, Phase09 backup rehearsal |
| P2 | C-013 | VERIFY | Published @prose-reader/koreader NPM package/version and lockfile may differ from source develop v30.2.0 | Phase01 dependency install lock+digest then Phase06 test |
| P2 | C-014 | VERIFY | CrossPoint TH/SDPlugin firmware/version capabilities not inspectable from GitHub source; no invented device PASS | Phase09 operator test EPUB, skip PDF |
| P2 | C-015 | REVIEW_CHANGES_REQUIRED_RE_REVIEW_PENDING | Independent review issued CHANGES_REQUIRED; implementer correction committed but fresh independent re-review not yet performed | New GPT Web session must re-review actual correction diff, evidence and gate |

## Contract acceptance rule
A verified source route is not runtime evidence. The implementation can proceed only for feature code guarded by `VERIFY/BLOCKED` flags; never enable unsafe writes before observed target tag/permission/readback. Phase 00 gate stays **CHANGES_REQUIRED_PENDING_INDEPENDENT_RE_REVIEW**.

### Added critical case — nonempty collection replacement

C-016 (P0, VERIFY/REQUIRE_DIFF): Under `REPLACE_WHEN_PROVIDED`, nonempty authors/categories and tags can **replace whole collections** when merge is disabled; this is not protected by scalar missing-field logic. Source [BookMetadataUpdater.java#L247-L380](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookMetadataUpdater.java#L247-L380). Phase03 must display old→new collection diff and require explicit per-field merge/replace policy. Preserve locks. Failure to review collection diff => reject Apply.


## Additional P0/P1 findings — 2026-10-29 implementer source recheck

| Priority | ID | Status | Evidence / risk | Required mitigation / phase |
| --- | --- | --- | --- | --- |
| P0 | C-017 | SOURCE_VERIFIED_REVIEW_REQUIRED | `mergeCategories` single-book query also merges/replaces **authors and reviews**, while moods/tags always merge=false in this path. [Service](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookMetadataService.java#L68-L83) / [Updater](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookMetadataUpdater.java#L107-L114). | Phase03: OPF collection field mask, old→new diff, explicit merge policy, skip unsafe collections. |
| P0 | C-018 | SOURCE_VERIFIED_REVIEW_REQUIRED | Official KOSync saves file progress and optionally projects its own CFI, risking double writers if Adapter also projects. [Source](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java#L80-L96). | Phase05/06: Native-single-writer default; Managed gated to proven gaps, exact spine/anchor fixture. |
| P0 | C-019 | SECURITY_REVIEW_REQUIRED | Personal entities are user-scoped but bookId creation/session read checks use unscoped repository lookup in inspected service methods. Not verified security vulnerability. [Bookmarks](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/book/BookMarkService.java#L37-L119), [Sessions](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/ReadingSessionService.java#L123-L149). | Phase02/07: verify all auth/aspect paths, require per-library book access and non-admin user-bound tokens, mocked 403; Phase09 staged negative tests. |
| P0 | C-020 | SOURCE_VERIFIED_ACCEPTED_RISK | Native KOSync sets status UNREAD for <0.25%, READING ≥0.25%, READ ≥99.5%, with no manual-read-status exemption in that method. [Source](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java#L215-L231). | Phase05/06: do not promise manual-status preservation, guard conflicts and document limitation; no invented percent. |
| P1 | C-021 | LANGUAGE_CLARIFICATION | Sidecar writer is gated by `appProperties.isLocalStorage()` and settings before write; prior wording must not imply unconditional NETWORK write. [Source](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/sidecar/SidecarMetadataWriter.java#L43-L77). | Phase03/04: inspect storage mode/Sidecar/Move settings and verify RO mount; no sidecar export on live NAS for tests. |

See [full targeted audit](phase-00/SOURCE-RECHECK-2026-10-29.md). Gate **NOT CONTRACT_LOCKED**; separate independent reviewer remains mandatory.


## Current 2026-10-29 correction disposition — CHANGES_REQUIRED

| IDs | Current issue / safe next step |
| --- | --- |
| C-001,016,017 | Reviews do not use replaceMode; empty-but-present list may clear. Single-book authors/categories/reviews coupled; scalar allowlist and reviewable field masks. |
| C-003,005,019 | BookAccessAspect is annotation-scoped; Native KOSync global hash and personal routes/rating/status lack proven book-library/content authorization. Deny unverified passthrough, no impersonation, Phase02/05/07 negative fixtures. Not a demonstrated exploit. |
| C-004,021 | Sidecar writer has global isLocalStorage guard, separate auto-move/embedded write. NAS RO and settings preflight. |
| C-006,013 | Converter returns string/undefined, not exact text proof; pin dependency and round-trip fixtures. |
| C-018,020 | Native file-progress write only attempted, potential stale/null CFI; native status can overwrite manual READ. Single writer and no status promises. |
| C-007,008 | Session 202 not exactly-once, cover API side-effects and readback unverified. |
| C-009,010,011 | Readest URL/hash/provisioning 401→403; OPDS add-only; gateway/auth/feed fixtures required. |
| C-002,012,014 | Installed versions, NAS, migration/restore and devices UNKNOWN; Phase09 only real test. |
| C-015 | Independent reviewer verdict was CHANGES_REQUIRED; source-doc correction **not independently reviewed yet**. |

All C-001–C-021 retained. [Correction report](phase-00/REMEDIATION.md). **NOT CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED**.

## 2026-10-29 — Implementer final remediation addendum (NOT independent approval)

See [Phase00 field-level, route and retry contract](phase-00/FINAL-REMEDIATION-2026-10-29.md). LIVE source baseline: Grimmory `402e89b4452f8e2b17ab95f16c1621c003516cd2`, Readest `3cc39ad7a558e6612e1a8135058fbd6f3c90b3e3`. R-01 scalar-only allowlist and all unapproved collections omitted; R-02 KO user identity proven through same user's `/api/v1/koreader-users/me` plus own JWT but unclosed Native KOSync TOCTOU; R-09 UNCERTAIN outbox at-most-one dispatch; R-11 historical status separated. `metadataApply`, `unverifiedKOSyncPassThrough`, `personalBridgeWrites`, `sessionsBridgeWrite` remain OFF. No deploy/runtime claims. Independent verdict still CHANGES_REQUIRED, Phase01 unauthorized.

