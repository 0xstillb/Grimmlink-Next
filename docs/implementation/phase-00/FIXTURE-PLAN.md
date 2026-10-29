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
