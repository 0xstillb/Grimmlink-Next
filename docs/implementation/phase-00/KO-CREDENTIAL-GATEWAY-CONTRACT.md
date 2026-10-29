## 2026-10-29 — AUTHORIZATION SOURCE REVIEW 43/43 STATIC_CLOSED; SECURITY GATE REMAINS BLOCKED

**Source-level Authorization Review:** [CI 40830006159](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40830006159) SUCCESS verifies **43/43 prioritized no-local-annotation mutating handler source dispositions** (all controller/method positions and pinned supporting service witnesses, zero missing). Implementer triage: **6 CRITICAL / 29 HIGH / 4 MEDIUM / 4 LOW**, not CVSS/exploit confirmation. **ZERO of the 43 may be forwarded / approved**; 348 handlers remain documentary deny-by-default pending precise runtime chain and per-book/user authorization. [Full source finding and gate receipt](PHASE00-AUTHORIZATION-REVIEW-43-STATIC-DISPOSITION-2026-10-29.md).

**New risk source flags:** mutable request token stored on KoboController singleton-like field; nested file ID progress not visibly bound to requested book; KO book hash not visibly checked against current user library/content; Magic Shelf public-create privilege absent in inspected creation branch; Kobo path/body entitlement mismatch; race safety of public first-admin setup unproven; KO registration request body/header log disclosure risks. No production exploitation asserted. Added 6 synthetic regression contracts: **109/109 fixtures STATIC_PASS in [CI 40830218540](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40830218540)**; actual Gateway/mock HTTP/log-sink/concurrency/SQLite tests **NOT_RUN**. Preserve earlier 923 Java AST/SHA, 403 static route declarations, 15/15 symbolic source constants, 160 classified inheritance files as source evidence, not runtime gates.

**Phase status remains CORRECTION_INCOMPLETE / CHANGES_REQUIRED (prior independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** NEW-P0-01 BLOCKED; no independent re-review, no PR merge/deploy/production or Phase01. Previous checkpoint counts (103 fixtures, 43 unreviewed source dispositions) below are historical.

---

## LATEST VERIFIED PHASE00 CHECKPOINT — 2026-10-29 (IMPLEMENTER SOURCE ONLY)

[CI 40828172115](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40828172115) SUCCESS: 923/923 pinned Java bodies SHA+AST; 348 source method handlers/403 declared method-path-verb variants (NOT runtime route count); 15/15 source constants. **160 lexical extends/implements files now classified by source AST**: 65 repository types, 49 service types, 10 security filter/interceptors, 9 model, 7 task, 7 converter, 11 other, 2 Web configuration. **0 direct method-mapping files** among those 160, yet inherited/alternate semantics remain NOT_PROVEN. Full pinned 923-file + Gradle scan found no Spring Data REST source symbols or direct dependency declarations, narrow source indicator only, NOT no-REST runtime proof.

**Critical KO logging source risk:** Registration handler logs incoming userData map at WARN; Official request logging config includes payload (10k limit) and headers but excludes neither x-auth-user nor x-auth-key by name. Actual output depends on runtime logger/chain, NOT_RUN. Added 2 synthetic KO payload/header log-sink fixtures; **103/103 fixture definitions static PASS**, actual HTTP/Gateway/log-sink tests NOT_RUN. [Detailed pinned source receipt](PHASE00-INHERITANCE-AND-KO-LOGGING-TRIAGE-2026-10-29.md). Other 348 authorization owners still DENY_BY_DEFAULT, 43 mutating handlers require ACL, 9 call chains/37 source witnesses verified only narrowly.

**NEW-P0-01 BLOCKED, CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED**. PR #2 remains Draft, no merge/deploy/Phase01. Earlier counts (101 fixtures / unclassified 160) in historical sections below are superseded. This is not independent approval.

---

# KO Registration Credential Logging — Safe Gateway Contract (NEW-P0-02)

**Pinned proof:** [KoreaderController.java:33–40](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/KoreaderController.java#L33) contains `log.warn(..., userData)` despite a 403 response; Readest's pinned `KOSyncClient.ts` can submit password MD5 in registration body. **No claim of production exposure or handler reachability**; filter order, active proxy rules and deployment remain unverified.

**Fail-closed decision:** Before request body forwarding or upstream dispatch, deny `POST /api/koreader/users/create` on all ingress surfaces. Normalize/canonicalize once at trusted edge and reject percent-encoded separators, double-encoding, dot-segments, mixed-case aliases, trailing slash and unreviewed host/SNI/rewrite aliases. No method override; do not allow fallback-to-Official. Direct Official backend ports must be inaccessible to clients. Observe `upstreamCallCount=0` at mock boundary on every deny.

**Filter chain requirement:** Phase02 must prove which authentication filter, authorization chain and request logging middleware execute before/after the route; preserve permitted `GET /api/koreader/users/auth` separately if independently authorized and redacted. Neither KO `x-auth-key` nor `x-auth-user` is a JWT; same-user proof and credential rotation handled by Phase05. Native KO progress remains BLOCKED/OFF.

**Observability:** Gateway logs allow only event ID, sanitized route class, decision code, count and correlation ID. Never log raw request body, raw KO headers, Authorization/JWT, x-auth-key, `password`, `passwordMD5`, synthetic hashes or registration payload; redact before any middleware sinks, including malformed requests and exception handling. Audit denial event `ko.registration.denied.redacted` must contain no secret. Synthetic captured-log assertion and upstream zero-call fixtures are in `SECURITY-NEGATIVE-FIXTURES.json`.

**Evidence status:** `SOURCE_VERIFIED` unsafe handler log; `DESIGN_SPECIFIED` Gateway deny/redaction. **NOT IMPLEMENTED_VERIFIED / NOT DEPLOYED_VERIFIED.** Owner Phase02/05, direct-bypass and real filter-order proof pending. No upstream modifications under No Fork.
