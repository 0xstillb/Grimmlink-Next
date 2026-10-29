# Phase 00 — Pinned Source Semantic & ACL Call-chain Receipt (2026-10-29)

**Implementer evidence only; independent verdict is still CHANGES_REQUIRED.**

## Verified scope and immutable references

- Repository: 0xstillb/Grimmlink-Next; branch feat/next-phase-00; Draft PR #2 remains unmerged.
- Official upstream source: grimmory-tools/grimmory at **402e89b4452f8e2b17ab95f16c1621c003516cd2**. The Git tree is complete (not truncated).
- Spring dependency: **spring-web 7.0.9** is listed in the same pinned Official **backend/gradle.lockfile:200**; Boot plugin **4.1.1** appears in **backend/build.gradle.kts:10**. The Spring Framework **v7.0.9** source tag resolves to commit **82a6b40b9366ec181ededdad282b307ee5381a52**; MediaType.java blob SHA **1d7ecf7fff9ad63926ea2ea00f54d39aecf12cff**.
- Independent historical reviewer HEAD: **9682f9ce9305ea5242af82418bec7e504bf1ca03**; reviewer verdict CHANGES_REQUIRED was not overwritten.

## Static CI evidence

[CI run 40821817455](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40821817455) completed **SUCCESS** (source-only checks, not runtime security tests).

| Evidence | Actual verified value |
| --- | --- |
| Java file body read + Git blob SHA | 923/923 |
| Java AST syntax parsing | 923/923; parser errors 0 |
| Controller annotation markers | 64 |
| Class mapping + method mapping annotations | 63 + 348 = 411 |
| Source method/path/verb declarations | 403 from 348 handlers; NOT actual Spring HTTP runtime routes |
| Previously symbolic mapping conditions | 15/15 **source constants identified** |
| Source local OPDS constants | 9, from pinned OpdsController.java:37–38 |
| Locked Spring MediaType constants | 6, from pinned spring-web 7.0.9 MediaType.java:100,262,319 |
| Unknown literal mapping paths | 0 |
| Source authentication ownership ledger | 348 handler entries; zero claimed authorization approvals |
| Missing method/class local security annotations among mutation handlers | 43 requiring downstream chain review |
| Lexical interface/inheritance source flags | 160; NOT 160 missing HTTP handlers |
| Manual source service-call trace | 9 sensitive handlers / 37 verified source witnesses |
| Synthetic fixture definitions | 101 unique; static validator failures 0 |
| Executed live Gateway / mocked HTTP / Spring runtime / SQLite crash / Phase09 E2E | NOT_RUN |

The Spring framework values are source-verified against the locked dependency version; **Gradle runtime dependency resolution, Spring route registration, chain execution and production behavior are not asserted**. This closes the *15 symbolic constant interpretation subissue* only, not the full NEW-P0-01 gate.

## Service-level findings with exact pinned source

1. **AppBook progress/status/rating (PARTIAL source proof)**: [AppBookService.java:208–228](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/app/service/AppBookService.java#L208-L228) verifies the current assigned-library ID, then delegates progress updates; [AppBookService.java:744–765](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/app/service/AppBookService.java#L744-L765) has a caller-user progress lookup. The scanned methods do **not** establish current per-book content restriction or file/edition entitlement. Bridge writes remain OFF.
2. **App Notebook update/delete (USER-RECORD owner lookup source proof)**: [AppNotebookService.java:93–155](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/app/service/AppNotebookService.java#L93-L155) dispatches highlight/note/bookmark mutations to [AnnotationService.java:94–99](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/book/AnnotationService.java#L94-L99), [BookNoteV2Service.java:92–97](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/book/BookNoteV2Service.java#L92-L97) and [BookMarkService.java:110–116](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/book/BookMarkService.java#L110-L116), which query by record ID **and authenticated user ID**. This is a narrower proof of record ownership only; it does NOT establish current library/content access after revocation. Remains OFF.
3. **Reset/rating batch (INCOMPLETE entitlement)**: [ReadingProgressService.java:280–292](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/progress/ReadingProgressService.java#L280-L292), [488–497](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/progress/ReadingProgressService.java#L488-L497), [BookUpdateService.java:77–99](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/book/BookUpdateService.java#L77-L99) and [335–345](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/book/BookUpdateService.java#L335-L345) show existence/user-progress checks, not current **per-ID assigned-library + content restriction** for an entire batch. R-02A must deny before a single upstream mutation for any ineligible ID. All reset types and rating bridges remain OFF.
4. **ReadingSession write (INCOMPLETE book eligibility)**: [ReadingSessionService.java:125–150](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/ReadingSessionService.java#L125-L150) fetches authenticated user and book by ID before saving a session. No per-book current entitlement check is evident in that method. No claim is made about security elsewhere in the call chain. No native session write/replay is enabled.
5. **WebSocket (PARTIAL protocol auth, separate from HTTP)**: [SecurityConfig.java:237–252](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/security/SecurityConfig.java#L237-L252) permits the HTTP handshake, but [WebSocketAuthInterceptor.java:28–108](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/security/interceptor/WebSocketAuthInterceptor.java#L28-L108) requires a Bearer JWT at STOMP CONNECT, enforces a narrow SUBSCRIBE destination prefix list and rejects client SEND. Per-topic content ACL not yet source-proven. WebSocket forwarding remains OFF.

**Source artifacts (all in docs/implementation/phase-00):** SOURCE-CONDITION-RESOLUTION.json, SOURCE-DECLARED-MAPPING-EXPANSION.json, SOURCE-AUTH-OWNERSHIP-LEDGER.json, SOURCE-AUTH-REVIEW-QUEUE.md, SOURCE-ACL-CALLCHAIN-TRACE.json, SOURCE-ACL-TRACE-VALIDATION.json, JAVA-SOURCE-WIDE-CENSUS.json, FIXTURE-STATIC-VALIDATION.json. Scripts and CI tests are under scripts/phase-00 and .github/workflows.

## Residual P0 gate and next session

- **NEW-P0-01 remains BLOCKED:** 348 source handler owners still require per-route authorization/matcher/alias disposition and explicit independently reviewable admission policies, including 43 priority mutations and alternate WebSocket/static/OPDS/Komga/Kobo/KO mechanisms. 160 lexical inheritance/interface source flags are a triage inventory, not automatic HTTP routes.
- Verify **Service-to-Repository data authorization** and current content restrictions for each supported sensitive route; do not accept global login alone as sufficient. Confirm no direct Official backend ingress in isolated test.
- KO registration credential logging deny/redact remains DESIGN_ONLY; Native KO atomic ownership, Reset R-02A, Metadata CAS and Reading Session Outbox remain OFF/BLOCKED. E2E remains Phase09 only.
- Separate fresh Independent Security Review is mandatory after implementing source-level route ownership and static/isolated proof; no implementer self-PASS, no automatic merge of Draft PR #2 or Phase01 start.
- Enforced state: **CORRECTION_INCOMPLETE / CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED**.
