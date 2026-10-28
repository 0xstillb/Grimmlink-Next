# Phase 00 Discrepancy & Blocker Register

**As of 2026-10-28:** source-only audit. `BLOCKED` = cannot safely enable feature without resolving before implementation/use; `VERIFY` = follow-up confirmation. Do not promote phase to CONTRACT_LOCKED until fresh reviewer.

| Priority | ID | Status | Finding / evidence | Owner / safe next step |
| --- | --- | --- | --- | --- |
| P0 | C-001 | BLOCKED_FOR_UNGUARDED_WRITE | Metadata API default `replaceMode=REPLACE_ALL`; null fields may clear unless `REPLACE_WHEN_PROVIDED` set explicitly. [Controller](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/controller/MetadataController.java#L51-L59) | Phase 02/03: URL builder rejects absent mode, clearFlags whitelist; mock neg tests |
| P0 | C-002 | VERIFY | Actual installed Grimmory tag/image digest, DB migration version, existing proxy owner :6060 and NAS mount/sentinel are **UNKNOWN**; public release != deployed instance | Phase09 real environment inventory; before source-driven implementation use pinned v3.5.0 candidate only |
| P0 | C-003 | VERIFY | JWT auth DTO/refresh/permissions, metadata BookMetadata nullable fields and per-user ownership must be re-opened and frozen before writing live Official endpoints; MD5 KOSync is not REST JWT | Phase 02: inspect auth controller/security/user linkage, deny impersonation |
| P0 | C-004 | VERIFY | NETWORK disk doesn't necessarily suppress Sidecar export and move-on-update settings; [Updater code](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookMetadataUpdater.java#L97-L170) still calls sidecar writer/move routine based on settings | Phase 03/04: fail-closed settings preflight, isolate no-write tests; Phase09 read-only real verification |
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
| P2 | C-015 | REVIEW_PENDING | Fresh independent GPT-6 reviewer has not reviewed this specific diff; source-audit authored in implementer session | New GPT Web session review exact commit, line-by-line PR |

## Contract acceptance rule
A verified source route is not runtime evidence. The implementation can proceed only for feature code guarded by `VERIFY/BLOCKED` flags; never enable unsafe writes before observed target tag/permission/readback. Phase 00 gate stays **REVIEW_PENDING**.
