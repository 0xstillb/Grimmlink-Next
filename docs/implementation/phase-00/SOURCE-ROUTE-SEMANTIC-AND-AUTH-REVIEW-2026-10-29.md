# GrimmLink Next Phase 00 — Source Route Semantics & Security Chain Audit (Implementer)

**Date:** 2026-10-29  
**Audit source:** grimmory-tools/grimmory v3.5.0 @ 402e89b4452f8e2b17ab95f16c1621c003516cd2  
**Working branch:** feat/next-phase-00; always fetch live SHA.  
**Independent reviewed source HEAD:** 9682f9ce9305ea5242af82418bec7e504bf1ca03  
**Status:** CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent reviewer) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.

## Reproducible static evidence and limits

- [CI 40819253130](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40819253130) ran Java21 AST scanner, method/path literal expander and fixture validator on exact pinned upstream. These are NOT deployed/Gateway/Spring-runtime tests.
- Source contents 923/923, Git blob SHA verified 923/923, AST parsed 923/923, errors 0.
- Exactly 64 controller annotation markers; 63 class mapping plus 348 method mapping = 411 mapping annotation occurrences.
- Static literal expansion: 348 handler records / 403 method-path-verb declarations, NOT 403 deployed endpoints. Class prefixes, method/path combinations, conditional params/headers/consumes/produces are retained in [machine mapping expansion](SOURCE-DECLARED-MAPPING-EXPANSION.json).
- Parenthesized ShelfController class prefix has been parsed; unknown path variants 0. Fifteen mapping records still include symbolic produces/consumes constants (e.g. Spring MediaType), retained as raw source rather than fabricated string literals.
- 196 handlers have local method security annotations, 9 more have class security annotations; 143 handlers lack both direct annotations. Forty-three mutating handlers belong to the latter group; this is NOT proof of unrestricted access (global HttpSecurity and service authorization remain relevant).
- 223 direct auth-annotation signals, 15 programmatic signals and 2 framework-type signals were catalogued, not all HTTP routes. 160 Java files carry lexical inheritance/interface signals, 0 of them are among the 348 method-mapping files; not a claim of 160 missing exposed endpoints.
- Exactly one identical path+verb bucket: GET /api/v1/books/{bookId}/files at AdditionalFileController.java:38 and :50, with params=isBook on one declaration. Do not call this a proven runtime collision; Spring matcher and conditions must decide.
- Unknown or sensitive route remains DENY_BY_DEFAULT as a design requirement; no executable gateway or deployed denial is claimed.

## Independently read Spring SecurityConfig source

All references below refer to [pinned SecurityConfig.java](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/security/SecurityConfig.java).

| Lines | Source declaration | Phase00 interpretation |
|---|---|---|
| 55–75 | COMMON_PUBLIC_ENDPOINTS includes /ws/**, /kobo/** and auth/OIDC/setup/healthcheck | Public matching does not imply downstream entitlement. No generic WS or token proxy allow. |
| 81–98 | OPDS Basic Auth chain for /api/v1/opds/** and /api/v2/opds/** | Separate interceptor, user scope and source owner review required. |
| 103–119 | Komga Basic Auth chain for /komga/api/v1/** and /komga/api/v2/** | Catch-all/multipath/methods require explicit admission, never wildcard personal passthrough. |
| 125–135 | KOReader chain /api/koreader/** with KoreaderAuthFilter and AuthenticationCheckFilter | KO POST /api/koreader/users/create remains deny-before-body with no credential logging. Native KO progress remains BLOCKED/OFF. |
| 139–148 | Kobo chain /api/kobo/** with KoboAuthFilter | Catch-all proxy and user scope require explicit reviewed ownership. |
| 152–234 | Media, fonts, EPUB, audio, book downloads use permitAll() together with JWT/query-token/authentication filters | permitAll alone is NOT open-content proof; filters, per-book entitlement and edition identity require review. |
| 237–252 | WebSocket /ws/** security chain permits HTTP-level request | [WebSocketConfig.java:64–75](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/WebSocketConfig.java#L64) exposes STOMP /ws with conditional CORS. Inspect inbound WebSocketAuthInterceptor / message ACL before any explicit proxy enablement. |
| 255–310 | Generic /api/** and /komga/** JWT matcher excludes public/OPDS/Kobo patterns | Lack of local annotation is not absence of global auth. Match ordering, JWT, ACL must be source-verified. |
| 312–328 | Catch-all static chain permitAll() | Combined with [WebMvcConfig.java:38–50](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/WebMvcConfig.java#L38) SPA /** fallback; this MUST NOT become unknown API path passthrough. |

Important: source line declarations are not proof of selected runtime chain. KOReader and Kobo both have @Order(3) in pinned source; isolated Spring runtime testing is needed to confirm ordering/selection rather than guessing.

## Mutation handler source-annotation gap

The machine mapping file identifies 43 mutation handlers without direct method/class security annotations. Examples: AppBookController#updateBookProgress/#updateStatus/#updateRating; AppNotebookController#updateEntry/#deleteEntry; BookController#resetProgress/#resetPersonalRating; KoreaderController#createUser/#updateProgress; KoboController#updateState/#catchAll; ReadingSessionController#recordReadingSession.

These are source-review priorities, NOT assertions of vulnerabilities or public route access. Check assigned library, current content restrictions, record ownership, per-book/edition identity, transaction safety, gateway chain, service ACL and deny-before-upstream for every sensitive candidate.

## Negative fixture coverage

- Prior 97 fixture definitions preserved; added 4 future mocked gateway denials: ROUTE-WS_UPGRADE_UNREVIEWED; ROUTE-WS_ORIGIN_WILDCARD; ROUTE-STATIC_FALLBACK_API_GUARD; ROUTE-WS_CANONICAL_ALIAS.
- Current 101 definitions, 101 unique IDs, R02A=30 / APP=15 / KOSYNC=19 / ROUTE=10 / METADATA=15 / SESSIONS=12. Static validator: 0 failures in CI.
- Every fixture remains executionState NOT_RUN. No mock HTTP, actual gateway, full JSON Schema engine, SQLite crash test, Spring runtime exporter or integrated Phase09 E2E was executed.

## Explicit remaining blockers

1. NEW-P0-01 remains BLOCKED. Reconcile method condition semantics, 15 symbolic value conditions, 160 lexical inheritance/interface signals, security chain and alternate mappings with route-level owner and authorization proof. Source P0 gaps cannot be moved to Phase02 just to claim a Phase00 PASS.
2. Spring runtime route exporter remains NOT_RUN: separate Phase02 proof, not a source-coverage substitute.
3. KO credential deny/redaction, App per-book/whole-batch ACL, Native KOSync atomic entitlement, OPF CAS and SQLite sessions remain DESIGN_ONLY / OFF / BLOCKED as applicable.
4. Separate Independent Security Review mandatory. No implementer self-PASS, no CONTRACT_LOCKED, no PHASE01 approval, no PR merge.

**Next action:** finish each source route family and security chain disposition, record source:file:line and gateway owner, validate, commit/readback and sync Notion, then submit to separate independent reviewer when source P0 gaps are truly closed.
