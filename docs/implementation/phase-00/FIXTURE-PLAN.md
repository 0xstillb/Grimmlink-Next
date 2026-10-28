# Phase 00 Contract Fixture Plan (design only)

Source-only discovery: no fixture files or commands executed yet. The following are deterministic fixtures to implement in Phases 01–08 and verify against isolated staging and actual clients in Phase09.

| Fixture | Essential positive/negative assertions | Phase |
| --- | --- | --- |
| metadata-safe-replace | Missing OPF fields preserved; required query mode; metadata wrapper and false clearFlags; locked fields untouched; stale fingerprint refused | 02/03 |
| metadata-collection | author/category/tag merge vs replace precedence; empty/blank fields not destructive | 03 |
| cover-multipart | only accepted safe cover, correct file key, cover lock/mismatch/no-change skips; GET readback | 03 |
| opf-path | symlink/root escape/XXE/DTD/zip-bomb prevention; NAS missing => PAUSED_NAS_OFFLINE | 03/04 |
| sidecar-network | import/export preview, no adjacent write and safe recovery | 04 |
| auth-pairing | MD5 KOReader x-auth vs JWT REST; no admin impersonation; mismatched user 401/403 | 02/05 |
| gateway-kosync | Readest base URL + /users/auth and /syncs/progress; path aliases with no double prefix; SSE/Range/OPDS pass-through | 02/05 |
| kosync-identity | partial MD5 vs filename digest, missing hash, concurrent device writers, same title different edition | 05 |
| epub-cfi | indexed text, DocFragment, Thai combining, XHTML element split, ruby, unmatched node => UNRESOLVED | 06 |
| pdf-progress | page 1-based normalization; format-specific payload, device support exclusions | 06 |
| reading-start | real two-page <0.5% doesn't fake percent; manual status not overwritten | 06 |
| personal-data | rating scope, bookmark CRUD, annotation validation and ownership denial, session 202 duplicate retry dedupe | 07 |
| update-check | upstream release diff, schema migration risk, no production auto-upgrade | 08 |

Every fixture has schema version, source tag SHA, request/response sanitized JSON, expected error paths, permission and exact test assertion; E2E remains PHASE_09_ONLY.
