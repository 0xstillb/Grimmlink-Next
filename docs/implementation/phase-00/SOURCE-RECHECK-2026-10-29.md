# Phase 00 — Targeted Source Recheck (2026-10-29)

**Author:** continuation/implementer session; **NOT independent review**. **Gate:** SOURCE_AUDITED_REVIEW_PENDING, not CONTRACT_LOCKED. This is a read-only check against publicly accessible upstream source and existing phase documents. No Hermes access, live API writes, unit/CLI execution, production NAS access, real reader tests or Phase09 E2E.

**Baseline reviewed:** [Draft PR #1](https://github.com/0xstillb/Grimmlink-Next/pull/1), prior verified head `7a3647a6aff08c7d0868fc976646e09a31eb7665`. Grimmory [v3.5.0](https://github.com/grimmory-tools/grimmory/tree/402e89b4452f8e2b17ab95f16c1621c003516cd2), Readest [v0.12.16](https://github.com/readest/readest/tree/3cc39ad7a558e6612e1a8135058fbd6f3c90b3e3), source baselines **not deployed-version claims**.

## Targeted source findings — action required before unsafe writes

### S-01 / C-017 — Metadata collection merge switch is coupled (P0)
- [BookMetadataService.java:68-83](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookMetadataService.java#L68-L83) sets `mergeCategories` from the query, but unconditionally sets `mergeMoods(false)` and `mergeTags(false)`.
- [BookMetadataUpdater.java:107-114](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookMetadataUpdater.java#L107-L114) supplies this *same* `mergeCategories` flag to **authors, categories and book reviews**. Under `REPLACE_WHEN_PROVIDED` nonempty collection input can replace existing members; scalar non-null safety is not enough.
- **Decision/guard:** OPF importer must omit authors/categories/moods/tags/reviews not explicitly present and approved; show original and proposed whole collection; explicitly choose merge/replace policy; do not pretend `mergeCategories` independently controls authors or that single-book PUT can merge tags/moods. If semantics are not safe, mark `REVIEW`/skip field rather than silently overwrite.
- **Test:** mocked old authors A+B, incoming A+C; categorical merge both ways; tags/moods nonempty; untouched omitted collections; user locks; event receipt of per-field provenance.

### S-02 / C-018 — Native KOSync writes file progress and optional CFI itself (P0)
- [KoreaderService.java:80-96](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java#L80-L96) saves user progress **and** calls `saveToFileProgress`.
- [KoreaderService.java:186-211](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java#L186-L211) tries native `convertXPointerToCfi` and sets EPUB progress when `syncWithWebReader` is enabled. It may fail; the returned CFI is not evidence of text-anchor EXACTness.
- **Decision/guard:** Native Official progress path owns writes by default. Adapter must not concurrently project a second competing EPUB/File progress update merely because native KOSync already returned 200. Managed CFI projection is **explicitly gated** by source-pinned gap proof, device/book identity match, exact spine/text anchor and safe conflict resolution. Keep raw XPointer if unverified.
- **Test:** mocked native=true/false, conversion failure, stale write, same-book different file, no double projection.

### S-03 / C-019 — Personal-data book ACL needs explicit confirmation (P0 security)
- [BookMarkService.java:37-119](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/book/BookMarkService.java#L37-L119) and [AnnotationService.java:35-106](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/book/AnnotationService.java#L35-L106) scope stored items to authenticated user, but new-item `findBook(bookId)` uses a repository lookup, not an explicit `@CheckBookAccess` at these endpoints.
- [ReadingSessionService.java:123-149](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/ReadingSessionService.java#L123-L149) similarly uses caller identity and `bookRepository.findById` without a visible per-book library permission guard.
- **Caution:** this is a **missing-source-evidence / potential authorization gap**, *not* a demonstrated exploit; any other enforced security layers must be reviewed before drawing conclusions.
- **Decision/guard:** Adapter must resolve and enforce caller-bound book access before reading/writing personal data, never proxy as another user or an unrestricted admin. Need denied-reader/foreign-library negative tests. If ownership cannot be verified, fail closed.
- **Test:** role combinations and multiple users; existing same-user item vs other-user ID; inaccessible library bookId; session creation denied; 401/403, no leaked data.

### S-04 / C-020 — Native KOSync can change manual Read Status (P0 data integrity)
- [KoreaderService.java:186-231](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java#L186-L231) invokes `updateReadStatus` after sync: fraction ≥0.995 → READ; ≥0.0025 → READING; otherwise UNREAD. It does not inspect previously manual status in that method.
- **Decision/guard:** Do not claim reading-status preservation or Continue Reading at zero/low % based solely on the Adapter. Retain previous status/readback and make the limitation visible. The safe fix may require user-visible Accepted Limitation or an explicit policy supported by official API, not a silent fake percentage or DB hack.
- **Test:** manual READ + native 0.0%, 0.2%, 0.3%, 99.5%; unchanged native location and server readback; no fake % or duplicate status writers.

### S-05 / C-021 — Sidecar NETWORK safety language clarification (P1)
- [SidecarMetadataWriter.java:43-77](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/sidecar/SidecarMetadataWriter.java#L43-L77) has an `appProperties.isLocalStorage()` early return **before** its adjacent `Files.writeString` path. Therefore it is inaccurate to say it *always* writes on NETWORK; it is also unsafe to infer per-library NETWORK mode alone makes all write paths inert. 
- [BookMetadataUpdater.java:125-174](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookMetadataUpdater.java#L125-L174) separately gates file/thumbnail writing, optional Sidecar write, and move-on-update.
- **Decision/guard:** Preflight global storage mode and all relevant persistence settings; ensure source is RO, sidecar/automatic move disabled, and actual source hashes unchanged. Never invoke Sidecar export on live NAS as a read-only check.

## Implementer review status / next gate
This recheck is a **source-evidenced correction**, not a fresh-context adversarial approval. `phase-00/REVIEW.md` must remain **PENDING_FRESH_CONTEXT_REVIEW** until an independent reviewer examines this and the entire phase diff and records issues by file:line. Installed Grimmory tag, MariaDB/Flyway state, proxy, NAS, credentials and physical devices remain UNKNOWN. Phase 01 is not authorized by this checkpoint.

**Validation performed:** GitHub source fetches and document/JSON checks in connected tool calls. No local terminal commands/test exit codes; no real E2E before Phase09.
