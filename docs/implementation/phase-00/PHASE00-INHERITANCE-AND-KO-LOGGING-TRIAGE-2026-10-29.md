# GrimmLink Next Phase00 — Inheritance, Repository REST and KO Logging Security Checkpoint

**Date:** 2026-10-29  
**Status:** IMPLEMENTER SOURCE EVIDENCE ONLY; NEW-P0-01 remains BLOCKED. Independent review is still CHANGES_REQUIRED; CONTRACT_LOCKED=false; PHASE01_AUTHORIZED=false.  
**Pinned Official source:** [grimmory-tools/grimmory@402e89b4452f8e2b17ab95f16c1621c003516cd2](https://github.com/grimmory-tools/grimmory/tree/402e89b4452f8e2b17ab95f16c1621c003516cd2).  
**Feature branch:** feat/next-phase-00, PR #2 DRAFT/UNMERGED, no integration/main edits.

## Verified static CI

- [GitHub Actions 40827694379](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40827694379): success. Independently pinned 923/923 Java body SHA checks and Java AST parse; 0 errors. Generated [JAVA-INHERITANCE-TYPE-TRIAGE.json](JAVA-INHERITANCE-TYPE-TRIAGE.json) with the original 160 lexical flagged files and each CLASS AST declaration. This is source syntax, not Java type binding.
- [GitHub Actions 40827899429](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40827899429): success. [REPOSITORY-REST-SOURCE-EXPOSURE.json](REPOSITORY-REST-SOURCE-EXPOSURE.json) read 923 Java source bodies, inspected the pinned backend/build.gradle.kts and gradle.lockfile, and catalogued 65 repository interface/type files.
- [GitHub Actions 40828172115](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40828172115): success. New KO payload and header logging-sink negative fixture definitions validated; **103 definitions / 103 unique IDs / 0 static failures** (prior 101 plus 2), all real execution remains NOT_RUN.
- Previously verified: 348 method mapping handlers, 403 declared method/path/verb combinations (NOT 403 runtime endpoints), all 15/15 symbolic media-type source constants resolved against exact Official/locked Spring source, and 9 manually source-validated service call chains (37 witnesses). These are NOT complete per-route authorization approvals.

## 160 extends/implements flagged Java files — real source categories

| Source classifier category | Java files | Correct interpretation |
| --- | ---: | --- |
| Data repository types | 65 | Spring Data repository interfaces, NOT automatically API controllers; direct REST exposure requires extra registration/dependency checks |
| Service/framework implementations | 49 | Backend classes implementing/extending service/framework types, not proven HTTP endpoints |
| Security filters and interceptors | 10 | Auth/policy hooks, relevant to requests but not standalone controller route declarations |
| Model, DTO and entity types | 9 | Data classes/interfaces |
| Background task/framework implementations | 7 | Task/lifecycle, not mapped HTTP handlers by this annotation census |
| Attribute converters and data layer | 7 | Data conversion types |
| Other extends/implements classes | 11 | Includes request logging filter, serializer and assorted classes; still requires targeted audit |
| Web configuration/alternate exposure | 2 | WebMvcConfig with static fallback and WebSocketConfig STOMP /ws endpoint; **separate security/owner review** |
| **Total** | **160** | All source files retain semantic review status, not automatically cleared |

All 160 source files have **zero direct method-mapping annotations** within the scanned file, but this does not rule out inheritance, meta-annotations, dynamic handler registration, servlet filters or an externally configured REST endpoint.

The pinned source/Gradle lock scan found **zero** Spring Data REST dependency entries in the lockfile, **zero** related declarations in build.gradle.kts, and **zero** RepositoryRestResource/RestResource or org.springframework.data.rest symbols across 923 pinned Java source files. This is a **narrow absence-of-indicator observation only**, NOT proof that all 65 repositories are unreachable by any HTTP mechanism. The rest of Spring Security, WebMVC, extra classpath and runtime must be independently reviewed.

## Additional KO credential disclosure source evidence — two logging planes

1. **Controller body log risk**: [KoreaderController.java:33–40](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/KoreaderController.java#L33) binds registration request JSON into userData and invokes a WARN log that includes the entire userData map before returning 403. Returning 403 alone is not safe proof against credential logging.
2. **Generic request logging configuration**: [RequestLoggingFilterConfig.java:12–36](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/logging/RequestLoggingFilterConfig.java#L12) configures setIncludePayload(true), a max payload length of 10,000, and setIncludeHeaders(true). The excluded header set has authorization, cookie, set-cookie, x-api-key and x-forwarded-access-token but not **x-auth-user** or **x-auth-key**. The excluded paths are only /api/v1/healthcheck and /ws. [RequestLoggingFilter.java:13–23](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/logging/filter/RequestLoggingFilter.java#L13) uses the configured predicate and then delegates shouldLog to its superclass.
3. **KO auth headers**: [KoreaderAuthFilter.java:29–34](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/security/filter/KoreaderAuthFilter.java#L29) reads x-auth-user and x-auth-key. An HTTP filter and header predicate can potentially process these values. Whether a log is actually emitted depends on logging level, middleware conditions and runtime chain; **do not assert observed secret leakage or production exposure**.

**Mandatory guard before any KO traffic forwarding:** Gateway must deny registration before any request body is forwarded and before an upstream log/filter can see credentials; block direct Official backend ingress; protect alternate path/method/host encodings; sink-capture synthetic-only payload/header/JWT logs at all applicable log levels. Denied request must have zero upstream attempts, no mutation and no secrets in gateway/audit logs. Existing upstream source is NOT modified.

**Added design-only fixtures:** KO-REGISTER-FILTER-PAYLOAD_REDACTION and KO-REGISTER-FILTER-HEADER_REDACTION in [SECURITY-NEGATIVE-FIXTURES.json](SECURITY-NEGATIVE-FIXTURES.json). They carry synthetic credentials only. Source-static checks passed; *actual negative/gateway/HTTP/log-sink tests remain NOT_RUN*. See [KO-CREDENTIAL-GATEWAY-CONTRACT.md](KO-CREDENTIAL-GATEWAY-CONTRACT.md) for full fail-closed requirements.

## Remaining gate

- **SOURCE_ANNOTATION_COMPLETE=false**, **RUNTIME_ROUTE_COMPLETE=NOT_RUN**. Syntax categorization of 160 files is not type-resolved inherited route proof.
- **348 handler route-owner/security decisions remain deny-by-default**, including **43 mutating handlers lacking local method/class auth annotations**. Inherited routes, WebSocket/STOMP destinations, static fallback, filter ordering, and ownership/canonicalization still require source and isolated proof. Current library/content and per-user record entitlement are not fully demonstrated.
- All personal App bridges, R-02A whole-batch resets, native KO progress, metadataApply, and session writes remain OFF/BLOCKED. No Phase01 authorization, no merge, no E2E outside Phase09.
- A fresh separate **Independent Security Reviewer** must verify the actual corrected source/contract HEAD; implementer evidence cannot self-PASS.
