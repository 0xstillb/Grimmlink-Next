# ADR-025 — Native KOSync No-Fork Security Feasibility (2026-10-29)
Status: **REJECT ENABLEMENT / BLOCKED_OFF**. Decision owner: Phase00 Architecture + Application Security; implementation gates Phase02 (Gateway), Phase05 (identity), Phase07 (personal REST). **Design-only**, not independently approved or deployed.

## Context and pinned evidence
Grimmory Official v3.5.0 commit `402e89b4452f8e2b17ab95f16c1621c003516cd2`; Readest Official v0.12.16 `3cc39ad7a558e6612e1a8135058fbd6f3c90b3e3`.
- [KoreaderAuthFilter:33–79](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/security/filter/KoreaderAuthFilter.java#L33-L79) checks KO username+passwordMD5, supplies KO user principal mapped to BookLoreUserId; **does not supply a REST JWT**.
- [KoreaderService:48–95,271–293](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java#L271-L293) selects book by global currentHash then stores progress for mapped user. No visible in-method library/content ACL.
- [BookAccessAspect:31–68](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/security/aspect/BookAccessAspect.java#L31-L68) checks assigned-library and content restriction on `@CheckBookAccess` handlers, NOT globally on all personal routes. Book GET annotated: [BookController:141–145](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/BookController.java#L141-L145).
- [KoreaderUserController:28–40](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/KoreaderUserController.java#L28-L40) same JWT caller's KO user profile; [UserController:33–36](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/UserController.java#L33-L36) own user. KO DTO includes secret fields and MUST be redacted. [SecurityConfig:125–135](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/config/security/SecurityConfig.java#L125-L135) KO-specific chain.
- [Readest KOSyncClient.ts](https://github.com/readest/readest/blob/3cc39ad7a558e6612e1a8135058fbd6f3c90b3e3/apps/readest-app/src/services/sync/KOSyncClient.ts) uses KO URL semantics including auth/create behavior. No fork of either Official permitted.

## Trust boundaries
Untrusted KOReader / Readest / CrossPoint → TLS `:6060` gateway only → private Adapter policy → isolated Official backend. **The only externally addressable listener is the gateway**. The Official container must have no host-published port, hostNetwork, alternate ingress, bridge IP reachable from clients, fallback rewrite, or privileged Docker socket. A transparent/default reverse-proxy fallback to Official for unknown `/api/koreader` and personal REST is prohibited. Gateway must own **method + canonical path** BEFORE upstream dispatch; reject percent-encoded slash, dot-segment, double-encoded, slash normalization ambiguity, alternate Host/SNI, trailing slash/semicolon, OPTIONS/HEAD preflight anomalies and client-controlled X-Forwarded headers. Explicit 403/404/405 on unknowns; all denies cause zero upstream mutation.

## Candidate same-user flow (NOT a security assurance)
1. Reader user consents via authenticated server-only flow with **their own** Official account; derive short-lived Official JWT and refresh using Official auth; encrypted per-user token vault, external key and no client-readable token. No admin JWT impersonation.
2. Same JWT GET `/api/v1/users/me` and `/api/v1/koreader-users/me`: correlate immutable Official account and its KO profile. Independently authenticate KO `x-auth-user/x-auth-key` using private Official `GET /api/koreader/users/auth`, never return KO user response secrets. KO password/passwordMD5/JWT never put in logs, browser, PR or Notion. Rotate on known credential changes; deny revoked/expired/disabled KO, logout, failed refresh.
3. Resolve KOSync document hash to **single** exact currentHash + bookId + bookFileId + file SHA/edition; reject duplicates, collisions, unknown current file and unrelated title. For each GET/PUT verify caller's same JWT `GET /api/v1/books/{bookId}` annotated with BookAccessAspect; require current library assignment AND content restriction eligibility; refuse stale cached entitlement. Cross-check all path/body document values and sensitive headers.
4. Re-check before native request, but that is NOT an atomic condition attached to Official's mutation. Revocation, book-file replacement, user KO profile rotation, network misrouting or TOCTOU can happen between steps. User-row ownership is separate from book entitlement. Native 200 need not prove exact CFI/file progress persisted.

## Threat and alternative analysis
| Threat / failure | Mitigation candidate | Residual |
| --- | --- | --- |
| KO MD5 credential used as substitute for Official account JWT | consent own JWT, match immutable account and KO profile, private KO auth | credential/JWT rotation race, vault exposure |
| global hash collision/edition drift | bound hash+exact file+edition mapping; reject ambiguous | no atomic version lock across Native PUT |
| library/content revocation mid-flight | fresh same-user annotated GET before each request | **TOCTOU UNRESOLVED**; precheck != atomic authorization |
| proxy alias/raw-decoded mismatch/direct Official port | explicit gateway route ownership + isolated network + deny/fail closed | MUST test deployment/network; design is not enforcement |
| KO secret leak from Official DTO | server-only DTO consumption, strict redaction, secure vault, network isolation | any downstream serialization mistake |
| Official UI broken by default-deny personal paths | complete route census and selective per-user mediation, compatibility tests | OFF policy deliberately can reduce UI functionality |
| duplicate progress writers / stale CFI | native sole writer if ever enabled, separate file readback | native saveToFileProgress may catch failure |
| pre-check/post-check/lock around Native PUT | none provides atomic ACL in stock upstream | **cannot guarantee required security property** |

## Feasibility and decision
**No-fork Native KOSync GET/PUT is REJECTED for activation** under a strict atomic per-book entitlement/security requirement: upstream Native progress handler cannot be made transactionally conditional on independently checked library ACL by a separate gateway without upstream support. Do not disguise an Adapter pre-check as atomic CAS. `NATIVE_KOSYNC_PROGRESS=BLOCKED/OFF`, `unverifiedKOSyncPassThrough=false`. No alternate admin credentials, unmanaged pass-through or direct backend access. KO auth/registration may be specified separately but no progress available and no self-registration promise. Default OFF may degrade client KOSync usability; disclose it.

Alternative A (recommended now): no external Native progress; retain Official UI REST only after full personal-route security intercept and UI regression coverage. Alternative B: future Adapter-managed secure progress using per-user Official REST only if each mutation can satisfy library ACL and race requirements atomically; never double-write; treat as a new ADR, not automatically approved. Alternative C: accept residual TOCTOU with explicit owner-signed security exception and separate independent review; **not accepted by this ADR**. Avoid fork unless user later explicitly reopens architecture.

## Required gates before any reassessment
- Phase02: demonstrate exact allow/deny route ownership (GET/PUT/POST/HEAD/OPTIONS) and no IPv4/IPv6/Host/SNI/alias/encoded/direct upstream bypass, including Official UI compatibility; static + isolated proxy tests.
- Phase05: same user JWT↔KO binding, rotation/revocation, exact hash/bookFileId/edition, missing/ambiguous identity fail-closed; controlled adversarial TOCTOU race.
- Phase07: per-book + user-row ownership for all personal REST including reset-progress (BOOKLORE/KOREADER/KOBO), reset-personal-rating, shelves, viewer settings, notes, sessions and bulk mixed IDs; no partial upstream mutation.
- Phase09: Hermes/NAS real network reachability, readers, upstream image digests, migration/rollback and full integrated E2E only.
- Even with all candidate fixtures passing, Native KOSync stays **OFF** unless the unclosed atomicity threat is resolved or explicitly re-decided by authorized security owner and independent reviewer. Phase00 author cannot self-approve.

## Acceptance negative fixtures (DESIGN_SPECIFIED; NOT_RUN)
1. Foreign library, user-row retained after revocation, content restriction, hash collision, edition mismatch: uniform deny, **zero upstream GET progress/PUT progress**, local `DENIED_ENTITLEMENT/IDENTITY` audit (redacted).
2. JWT↔KO mismatch, KO MD5 rotation, token expiration, disabled sync, stale credential: deny with no mutation, vault generation marked revoked.
3. Revocation injected *after* precheck before Native PUT: must not claim PASS with a merely successful precheck; fixture classified `BLOCKED_ATOMICITY`.
4. Double slash/percent-encoded slash/dot segment/mixed case/duplicate-prefix/Host rewrite/CORS/HEAD/OPTIONS/unknown fallback: uniform denial; no Official sensitive route reached.
5. Direct backend host port/IPv6/docker subnet bypass: unreachable at network layer; deployment remains `NOT_RUN`.
6. Ensure no password, passwordMD5, KO header, JWT, or notes in untrusted logs/responses/events.
7. Full attached [route census](phase-00/ROUTE-CENSUS-INDEX.md) and R-02A [security report](phase-00/SECURITY-REMEDIATION-2026-10-29.md) must be included in independent review.

**Evidence states:** SOURCE_VERIFIED partial code paths; DESIGN_SPECIFIED flow/fixtures; IMPLEMENTED_VERIFIED **NO**; DEPLOYED_VERIFIED **NO**; tests NOT_RUN. Historical verdict **CHANGES_REQUIRED**.
