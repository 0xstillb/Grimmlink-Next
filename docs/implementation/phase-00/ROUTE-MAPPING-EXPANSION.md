## LATEST VERIFIED STATIC EVIDENCE — Phase00 Route Semantics, 2026-10-29 (NOT Independent Approval)

[CI run 40819253130](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40819253130): pinned 923/923 Java bodies SHA-verified and AST parsed (0 errors), 64 Controller markers, 63 class +348 method =411 mapping annotations, **403 static method/path/verb declarations (not runtime route count)**. All method paths resolved; **15 symbolic consumes/produces conditions** remain. **223 security annotation signals**, **15 programmatic** and **2 framework-type signals**; **43 mutation handlers without local annotations** require global/service ACL investigation, not proof of unauthenticated access.

**101 security fixtures** (97 prior +4 WebSocket/static), static validator zero failures; every actual mock/HTTP/security/SQLite test NOT_RUN. [Source auth audit](SOURCE-ROUTE-SEMANTIC-AND-AUTH-REVIEW-2026-10-29.md) details pinned SecurityConfig chains. SOURCE_ANNOTATION_COMPLETE=false; RUNTIME_ROUTE_COMPLETE=NOT_RUN; NEW-P0-01 BLOCKED. CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED. Older checkpoints below are historical when referring to 859 unread Java bodies or 97 current fixtures.

---

# Source Mapping Expansion and Coverage Boundary

Pinned: `402e89b4452f8e2b17ab95f16c1621c003516cd2`. The previously unresolved [KomgaController:251–264](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/KomgaController.java#L251) declares **9 path patterns and 5 explicit HTTP methods** = 45 declared method/path candidates from **one** method-level annotation (NOT 45 annotations). Class prefix: `/komga/api`, class `produces=application/json`. The paths are `/v1/readlists`, `/v1/series/new`, `/v1/series/updated`, `/v1/series/list`, `/v1/series/genres`, `/v1/books/ondeck`, `/v1/books/list`, `/v1/books/*/readlists`, `/v1/books/*/manifest`. HTTP methods: GET, POST, PUT, DELETE, PATCH; expected handler returns HTTP 501. Route expansion `SOURCE_DECLARED_EXPANSION` only; Spring pattern matching and runtime intersection not verified.

- [KomgaController:278](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/KomgaController.java#L278) adds `/komga/api/**` catch-all with five declared methods; 404 behavior from inspected method, not promise for every runtime alias.
- [KoboController:277](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/KoboController.java#L277) adds `/api/kobo/{token}/**` catch-all with five declared methods; it can proxy to Kobo store conditionally and thus is NOT a harmless fixed 404.
- [AdditionalFileController:38,50](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/AdditionalFileController.java#L38) has `GET /api/v1/books/{bookId}/files` and `GET` with `params="isBook"`; route specificity/params can disambiguate, NOT an assumed duplicate collision.
- Class-level path, `produces`, method, `params`, `headers`, `consumes`, `produces`, HEAD/OPTIONS, path-variable semantics and proxy rewrite are dimensions of the effective mapping. Never multiply annotations into fictitious full-route totals.

## Completeness status

Pinned recursive tree of `backend/src/main/java/org/booklore` inspected, 1017 tree entries and 923 Java files reported; 64 files named `*Controller.java` were discovered, including 56 root and 8 App. This **name census** does not prove that other Java classes lack `@Controller`, functional `RouterFunction`, framework-generated routes, servlet/filter endpoints, Actuator or static routes; no exhaustive source-text scan of all 923 Java files or runtime exporter has been performed in this correction. Thus `RECOGNIZED_CONTROLLER_NAME_CENSUS=64/348`, `SOURCE_ANNOTATION_COMPLETE_BACKEND=UNVERIFIED`, `RUNTIME_ROUTE_COMPLETE=NOT_RUN`. Gateways default-deny unclassified sensitive requests. Exact runtime map comparison is owned by Phase02 isolated tests, not an E2E claim.


## Source-wide AST follow-up — resource/WebSocket mechanisms (implementer, 2026-10-29)

An actual pinned-content SHA check and JDK21-preview AST parse of all 923 Java bodies succeeded (0 parse diagnostics), giving 348 method mapping annotation occurrences, 63 class-level mapping annotations and 64 Controller markers. These are *occurrences*, not expanded HTTP routes. The earlier statement that the 859 bodies were not scanned is historical and now superseded for **content coverage only**. Semantic mapping ownership is still unverified and SOURCE_ANNOTATION_COMPLETE remains FALSE. See SOURCE-WIDE-MECHANISM-RECONCILIATION-2026-10-29.md.

Non-Controller mechanisms identified: pinned WebMvcConfig.java lines 37–62 registers a static / ** resource fallback (literal /**), index.html resolver and OPDS/Komga interceptors. Pinned WebSocketConfig.java lines 62–75 registers /ws STOMP handshake, with conditional origin policy; /app and /user are messaging prefixes, not independently proven HTTP paths. These must be reviewed under explicit Gateway ownership, not treated as benign unknown wildcard routes. Runtime exporter NOT_RUN.
