# OPF Scalar Payload Contract — R-01 (Design-only; 2026-10-29)

**DO NOT ENABLE METADATA APPLY.** Evidence: [BookMetadata.java:18–132](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/model/dto/BookMetadata.java#L18-L132), [MetadataController:51–59](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/MetadataController.java#L51-L59), [BookMetadataUpdater:177–245](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/metadata/BookMetadataUpdater.java#L177-L245). **Schema is not an implementation or proof of race-free apply.**

| Allowlisted field | Pinned Java DTO type | Adapter input rule | Lock proof |
| --- | --- | --- | --- |
| title | String | trimmed nonblank string | titleLocked |
| subtitle | String | trimmed nonblank string | subtitleLocked |
| publisher | String | trimmed nonblank string | publisherLocked |
| publishedDate | LocalDate | strict ISO YYYY-MM-DD, valid calendar date | publishedDateLocked |
| description | String | nonblank sanitized length-bounded string; preserve intentional whitespace as authorized | descriptionLocked |
| seriesName | String | trimmed nonblank string | seriesNameLocked |
| seriesNumber | Float | finite positive numeric; forbid NaN/Infinity and precision drift | seriesNumberLocked |
| isbn13 | String | preserve leading zeros, validate format/check digit per approved policy | isbn13Locked |
| isbn10 | String | preserve leading zeros, validate format/check digit per approved policy | isbn10Locked |
| language | String | nonblank normalized language code under approved format | languageLocked |

`allMetadataLocked` denies all fields. Read current locks from authorized Official **server**, never client input. Every field is OMITTED if missing, null, empty/blank or wrong type; never send a default or clear to emulate omission. Unknown properties, `bookId` metadata alias, nested DTOs, provider, `*Locked`, any `clearFlags` that can delete, and collections are not allowed. Explicitly do NOT transmit `authors`, `categories`, `moods`, `tags`, `bookReviews` — even `[]`; `seriesTotal` and `pageCount` require separate provenance approval and stay OFF.

## Admission sequence (no false atomicity)

1. Authenticated **actual editing user**, current book entitlement and metadata edit permission; read current book, bookFile, edition, field locks, exact source path and NAS read-only sentinel.
2. OPF must parse securely without entity expansion, be adjacent to expected EPUB and have immutable source fingerprint/hash and path-containment proof; reject symlink/path changes, duplicate ambiguous candidates or mount changes.
3. Produce exact approved sparse allowlist; `PUT /api/v1/books/{bookId}/metadata?replaceMode=REPLACE_WHEN_PROVIDED&mergeCategories=false` with no collection and either no `clearFlags` field or explicitly all false only if checked safe. Per-field review fingerprint binds source, target, user and allowed operation; no replay on uncertainty.
4. Compare source fingerprint, current target readback and lock bits again, then apply ONLY if official transaction safety evidence is independently accepted. **A read-then-write is NOT compare-and-swap.** Without Official atomic target revision/ETag or independently approved conflict prevention, metadataApply remains OFF because zero lost update cannot be guaranteed.
5. If eventually enabled, verify Official target and source readback, inspect linked embedded file write, Sidecar export/global isLocalStorage guard and move-on-update settings independently; never write adjacent RO NAS, do not treat remote 200 as file safety proof.
6. Abort on stale OPF, concurrent update, library change, lock change, uncertain API result, mismatch, unexpected side effect. Emit redacted receipt with event ID and immutable hashes; do not reveal titles/private notes/files or retry uncertain writes.

**Owner:** Phase03 payload builder + isolated mock tests, Phase04 source/mount safety, Phase00 independent design decision. **Evidence:** SOURCE_VERIFIED for DTO types, DESIGN_SPECIFIED for contract, NOT_RUN tests, BLOCKED/OFF apply.
