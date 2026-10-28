# Official API Inventory — To Verify in Phase 00

**Status:** SOURCE_REVIEW_REQUIRED. These routes are candidate contracts based on earlier source inspection; their availability, authorization and DTO in the **deployed pinned release** have not been verified here.

| Concern | Candidate Official route | Critical check |
| --- | --- | --- |
| Metadata | `PUT /api/v1/books/{bookId}/metadata?replaceMode=REPLACE_WHEN_PROVIDED` | MetadataUpdateWrapper, locks, clear flags, fields |
| Cover | `POST /api/v1/books/{bookId}/metadata/cover/upload` | multipart `file`, permissions, cover lock |
| KOSync auth | `GET /api/koreader/users/auth` | client headers/auth; gateway base URL |
| KOSync progress | `GET /api/koreader/syncs/progress/{hash}`, `PUT /api/koreader/syncs/progress` | digest semantics, revision/conflict, user binding |
| Book progress | `POST /api/v1/books/progress` | format-specific DTO, timestamp, percentage semantics |
| Read status | `POST /api/v1/books/status` | safe status updates, does not itself create lastReadTime |
| Rating | `PUT /api/v1/books/personal-rating` | 1–5 scale, authorization and reset |
| Bookmarks | `/api/v1/bookmarks` | endpoints/DTO and valid CFI |
| Annotations | `/api/v1/annotations` | EPUB CFI, format and user scope |
| Sessions | `POST /api/v1/reading-sessions` | DTO, idempotency / readback |
| OPDS | `/api/v1/opds/catalog` | shelfId/magicShelfId, paging, auth |
| Sidecar | Official Sidecar endpoints | Schema, NETWORK skip-writes |
| Version/capabilities | Determine from target release | Avoid assumed /version endpoint |

## Audit instructions

For each used endpoint, save: pinned release tag / commit SHA, source path/line, actual method/path, headers/auth, request schema, response schema, error/status, defaults, readback behavior, version-sensitive risks, tests, owner (Official or Adapter) and status VERIFIED/VERIFY/BLOCKED.

**No production writes** should be built from unverified guesses. Mock fixtures are not evidence of live API compatibility.
