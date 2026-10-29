# Grimmory Pinned Source-wide Mechanism Reconciliation — 29 October 2026

## Reproducible source coverage (not review acceptance)

- Pinned Grimmory v3.5.0 commit: 402e89b4452f8e2b17ab95f16c1621c003516cd2.
- Git tree: truncated=false; 923 Java files in backend/src/main/java/org/booklore/.
- Pinned content bodies read and Git blob SHA verified: 923/923; Java21 preview AST parse: 923/923; syntax diagnostics: zero in last completed run.
- Existing named Controller census reconciles mechanically: 64 Controller annotations, 63 class-level mapping annotations, 348 method-level annotations = 411 total mapping annotations. This is not an expanded HTTP route count.
- The Java AST tool is *syntax-only*. It cannot claim complete type-resolved inheritance, meta-annotation semantics, Spring runtime expansion or app-authorization proof.
- Source mapping AST candidates, per-file hash ledger and exact lines: JAVA-SOURCE-WIDE-CENSUS.json and SOURCE-ROUTE-CANDIDATES.json.
- Scanner enhanced to include resource, interceptor, STOMP/WebSocket and alternate endpoint signal families. Source signal output requires rerun/readback.

## Independently read non-Controller mechanisms

| Pinned upstream file and lines | Source behavior | Gateway and proof disposition |
| --- | --- | --- |
| config/WebMvcConfig.java:37–50 | addResourceHandler("/**") serves classpath:/static/ and fallback index.html | Source-confirmed static fallback; **not** blanket API proxy; explicitly review Official UI GET/HEAD only, path normalization/canonicalization; runtime matcher NOT_RUN |
| config/WebMvcConfig.java:56–62 | interceptors for /api/v1/opds/**, /api/v2/opds/**, /komga/api/** | Interceptors affect dispatch/policy, are not standalone handler routes; preserve existing security decisions, do not infer entitlement |
| config/WebSocketConfig.java:62–75 | STOMP /ws endpoint and conditional CORS allowed-origin logic | WebSocket handshake is an alternate exposure not represented in 348 HTTP method annotations; DENY unless explicit, source-reviewed ownership and auth validation |
| config/WebSocketConfig.java:44–49 | Broker /queue and /topic; application prefix /app; user prefix /user | STOMP destinations, not automatically HTTP routes. Inspect message authorization/handlers; no public pass-through assumed |
| config/security/annotation/CheckBookAccess.java:5–10 | @interface CheckBookAccess targeting methods; no @RequestMapping meta-annotation | Security/authorization annotation, not a composed HTTP route declaration in inspected definition |
| config/security/annotation/CheckLibraryAccess.java:6–11 | @interface CheckLibraryAccess targeting methods; no @RequestMapping meta-annotation | Security/authorization annotation, not a composed HTTP route declaration in inspected definition |

Source permalink prefix: https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/

## Security and contract limits

- Sensitive unknown route/alias/proxy/WS dispatch: **DENY_BY_DEFAULT**. Legitimate Official UI paths require a narrow explicit gateway policy and independent review.
- KomgaController.java:251–264 retains **9 path variants x 5 declared verbs**, distinct from one annotation; Komga:278 and Kobo:277 catchalls remain sensitive. AdditionalFileController:38,50 params=isBook is conditional and not automatically an actual collision.
- All 97 fixture definitions have passed the static field/causal validator without changes; actual negative/gateway/HTTP/security execution is NOT_RUN.
- NEW-P0-01 content-read subgate met, but *semantic route ownership/gateway proof remains P0 blocked*. SOURCE_ANNOTATION_COMPLETE=false; RUNTIME_ROUTE_COMPLETE=NOT_RUN.
- NEW-P0-02 KO registration deny/redact is design-only; R-02A App batch, R-02 native KO atomic entitlement, R-01 metadata CAS and R-09 SQLite session outbox remain OFF/BLOCKED pending their gates.
- Current implementer status: CORRECTION_INCOMPLETE. Last independent reviewer verdict CHANGES_REQUIRED. NOT_CONTRACT_LOCKED, PHASE01_NOT_AUTHORIZED.
- No historical reviewer report edited, no Production/hermes/NAS/deployed testing.

## Next exact source work

Re-run amended scanner. Inspect every noncontroller programmatic/WS candidate and every symbolic/conditional/composed/inherited mapping; produce exhaustive class+method path and conditions table; reconcile per-route auth/proxy/side effects with source-backed gateway-owner decisions, then seek a **separate fresh Independent Review**. Do not self-approve or merge PR #2.
