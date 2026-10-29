## LATEST VERIFIED STATIC EVIDENCE — Phase00 Route Semantics, 2026-10-29 (NOT Independent Approval)

[CI run 40819253130](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40819253130): pinned 923/923 Java bodies SHA-verified and AST parsed (0 errors), 64 Controller markers, 63 class +348 method =411 mapping annotations, **403 static method/path/verb declarations (not runtime route count)**. All method paths resolved; **15 symbolic consumes/produces conditions** remain. **223 security annotation signals**, **15 programmatic** and **2 framework-type signals**; **43 mutation handlers without local annotations** require global/service ACL investigation, not proof of unauthenticated access.

**101 security fixtures** (97 prior +4 WebSocket/static), static validator zero failures; every actual mock/HTTP/security/SQLite test NOT_RUN. [Source auth audit](SOURCE-ROUTE-SEMANTIC-AND-AUTH-REVIEW-2026-10-29.md) details pinned SecurityConfig chains. SOURCE_ANNOTATION_COMPLETE=false; RUNTIME_ROUTE_COMPLETE=NOT_RUN; NEW-P0-01 BLOCKED. CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED. Older checkpoints below are historical when referring to 859 unread Java bodies or 97 current fixtures.

---

## CURRENT — Phase00 Final Security Correction Checkpoint (2026-10-29; implementer, not independent approval)

Start `1370f9f38482af1442a3ecd7570e7dbbc4ac3bdd` (independent report commit); independently reviewed immutable HEAD `9682f9ce9305ea5242af82418bec7e504bf1ca03` is distinct; fixture/security-design correction commit `496681b307dd71fefedb649d951079557dc431f9`. **97 synthetic fixture definitions (70 original + 27 added, 11 modified); all execution NOT_RUN**. See [final correction report](FINAL-SECURITY-CORRECTION-2026-10-29.md), [KO contract](KO-CREDENTIAL-GATEWAY-CONTRACT.md), [App ACL](APP-AUTHORIZATION-MATRIX.md), [Phase acceptance](CONTRACT-LOCK-ACCEPTANCE-CRITERIA.md). **NEW-P0-01 remains P0 BLOCKER**: 923 Java files in pinned tree but only 64 named controllers/348 annotations previously read, full remaining source-wide audit not completed; runtime Spring routes NOT_RUN. NO SOURCE_ANNOTATION_COMPLETE claim. KO logging mitigations are DESIGN_SPECIFIED, not deployed; metadata/session post-send fixtures now use UNKNOWN remote mutation. Native KO progress, metadataApply, personal bridges, resets and session writes BLOCKED/OFF (design-only). **Independent verdict remains CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** PR #2 Draft / do not merge; full E2E Phase09 only.

---

## CURRENT — Source-backed negative fixture expansion (NOT_RUN)

[Machine-readable fixture contract](SECURITY-NEGATIVE-FIXTURES.json) contains **70** designed cases across ROUTE/R-02A/APP/KOSYNC/METADATA/SESSIONS. Each defines request, preconditions, expected HTTP status (null when network crash prevents one), upstream call and mutation count, ledger state, audit event, owner, source, and test path null; no actual test executed. Positive 200/202 expectations are future mocked-contract behavior **when enabled**, not currently usable endpoints. Phase02/03/05/07 isolated source/mock/crash tests required; runtime exporter and integrated Phase09 E2E NOT_RUN. Contract: no fallback, no partial batch, no uncertain replay.

---

## Latest Phase00 Security Remediation — 2026-10-29 (NOT independent approval)

**R-02A NEW P0:** Official `POST /api/v1/books/reset-progress` (BOOKLORE/KOREADER/KOBO) and `POST /api/v1/books/reset-personal-rating` require deny-before-upstream gateway coverage, current assigned-library/content eligibility for EVERY book ID, own-record eligibility and all-or-nothing mixed-batch rejection. Other sensitive routes include viewer-setting, shelves, notes v1/v2, PDF annotations, session reads/writes and KO profile. **56 source Controller files / 321 method-level annotations** inspected; runtime Spring mapping/aliases NOT_RUN. No generic sensitive fallback. **NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF**: precheck TOCTOU not atomic. `metadataApply=OFF`, `personalBridgeWrites=OFF`, `sessionsBridgeWrite=OFF`; design != executable enforcement. Historical **CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED** unchanged; no merge or Phase01. Correction baseline `59773bd65eb265dbe4850204a65649b7c8a5c51c`, read LIVE HEAD for new commits.

[Security remediation](SECURITY-REMEDIATION-2026-10-29.md) · [Full annotation census](ROUTE-CENSUS-INDEX.md) · [ADR-025](../ADR-025-NATIVE-KOSYNC-SECURITY.md)

# Phase 00 Contract Fixture Plan (design only)

Source-only discovery: no fixture files or commands executed yet. The following are deterministic fixtures to implement in Phases 01–08 and verify against isolated staging and actual clients in Phase09.

| Fixture | Essential positive/negative assertions | Phase |
| --- | --- | --- |
| metadata-safe-replace | Missing OPF fields preserved; required query mode; metadata wrapper and false clearFlags; locked fields untouched; stale fingerprint refused | 02/03 |
| metadata-collection | whole-set author/category/tag/review merge/replace diff; missing/null vs present-empty reviews; explicit lock-bit/clearFlags guard; never trust replaceMode alone | 03 |
| cover-multipart | only accepted safe cover, correct file key, cover lock/mismatch/no-change skips; GET readback | 03 |
| opf-path | symlink/root escape/XXE/DTD/zip-bomb prevention; NAS missing => PAUSED_NAS_OFFLINE | 03/04 |
| sidecar-network | import/export preview, no adjacent write and safe recovery | 04 |
| auth-pairing | MD5 KOReader x-auth vs JWT REST; no admin impersonation; mismatched user 401/403 | 02/05 |
| gateway-kosync | Readest base URL + /users/auth and /syncs/progress; path aliases with no double prefix; SSE/Range/OPDS pass-through | 02/05 |
| kosync-identity | partial MD5 vs filename digest, missing hash, concurrent device writers, same title different edition | 05 |
| epub-cfi | indexed text, DocFragment, Thai combining, XHTML element split, ruby, unmatched node => UNRESOLVED | 06 |
| pdf-progress | page 1-based normalization; format-specific payload, device support exclusions | 06 |
| reading-start | real two-page <0.5% never fabricates percent; verify actual Native KOSync status thresholds instead of falsely assuming manual status preservation | 06 |
| personal-data | rating scope, bookmark CRUD, annotation validation and ownership denial, session 202 duplicate retry dedupe | 07 |
| update-check | upstream release diff, schema migration risk, no production auto-upgrade | 08 |

Every fixture has schema version, source tag SHA, request/response sanitized JSON, expected error paths, permission and exact test assertion; E2E remains PHASE_09_ONLY.


## Additions from 2026-10-29 source recheck

- `metadata-coupled-merge`: Authors A+B, incoming A+C, categories and bookReviews, with query mergeCategories ON/OFF; independently include nonempty moods/tags in PUT and require skip when preserving existing members cannot be guaranteed.
- `native-sync-single-writer`: Native KOSync saves file progress/CFI; verify Adapter does not issue second progress write when native already owns projection. Preserve original XPointer on CFI conversion failure and reject stale identity.
- `native-read-status`: manually READ + KOSync at 0%, 0.2%, 0.3%, 99.5%, ensuring no fake percentage and explicit accepted status effects.
- `personal-cross-library-permissions`: authenticated accounts with/without access to a book library; deny creating bookmarks, annotations or sessions against inaccessible book IDs and foreign user-owned items. Mock before Phase09 real isolated staging.
- `sidecar-storage-switches`: differentiate global `isLocalStorage()`, Sidecar settings, metadata file write and move-on-update; ensure RO NAS unchanged and no misuse of export API.


## Additional corrected fixtures — **design only, NOT_RUN**

- `opf-reviews-null-empty`: missing/null vs `bookReviews: []`, coupled mergeCategories across authors/categories/reviews, moods/tags false, lock-bit omission, explicit replaceMode and false clearFlags, stale source diff.
- `native-personal-book-entitlement`: CheckBookAccess on annotated controllers only; deny foreign library/filtered content for Native hash GET/PUT and bookmark/annotation/session/rating/status; no admin impersonation, assert no side effects.
- `native-kosync-progress-receipt`: 200 without verified EPUB CFI, stale/null file progress, caught exception, single-writer, identity mismatch.
- `native-read-threshold`: fractions 0.0 and 0.002 => UNREAD, 0.003 => READING, 0.995 => READ, including previously manual READ; no fake percentage/status compensator.
- `nas-sidecar-global-setting`: global isLocalStorage vs per-library NETWORK, file write/move settings, RO mount sentinel, prohibit export.
- `cfi-exact-anchor`: same EPUB bytes/edition/spine DOM text-offset round-trip, Thai combining, rubies/invalid pointers and mismatches => CHAPTER_ONLY/UNRESOLVED.
- `readest-kosync-register`: Readest 401 -> /users/create -> Official 403 and correct gateway prefix, OPDS add-only.
- `session-cover-uncertain-ack`: 202 duplicate retry ledger and separate validated cover bytes/locks/readback.

[Source references and gate matrix](REMEDIATION.md). No unit/mock/CLI/E2E execution in Phase00. All real devices/NAS/Hermes E2E Phase09 only.

- `gateway-deny-until-entitled` (Phase02/05): external canonical GET and PUT plus `/api/koreader` aliases and direct Official bypass attempts, invalid/unprovisioned user, foreign library, restricted content, hash collision, edition mismatch, stale mapping, concurrent writers and admin surrogate must be denied **before upstream** with no mutation or existence leak; allow only bound-user entitlement proven for the exact book.
- `personal-bridge-entitlement` (Phase02/07): bookmarks/annotations GET-by-book and CRUD-by-item, sessions GET/POST, ratings/status/progress and foreign-owner IDs must enforce both per-book library/content authorization and per-row user ownership, no admin token substitution; test deny and no side effects.

## 2026-10-29 — Implementer final remediation addendum (NOT independent approval)

See [Phase00 field-level, route and retry contract](FINAL-REMEDIATION-2026-10-29.md). LIVE source baseline: Grimmory `402e89b4452f8e2b17ab95f16c1621c003516cd2`, Readest `3cc39ad7a558e6612e1a8135058fbd6f3c90b3e3`. R-01 scalar-only allowlist and all unapproved collections omitted; R-02 KO user identity proven through same user's `/api/v1/koreader-users/me` plus own JWT but unclosed Native KOSync TOCTOU; R-09 UNCERTAIN outbox at-most-one dispatch; R-11 historical status separated. `metadataApply`, `unverifiedKOSyncPassThrough`, `personalBridgeWrites`, `sessionsBridgeWrite` remain OFF. No deploy/runtime claims. Independent verdict still CHANGES_REQUIRED, Phase01 unauthorized.

