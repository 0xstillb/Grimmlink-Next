## CURRENT — Phase00 Final Security Correction Checkpoint (2026-10-29; implementer, not independent approval)

Start `1370f9f38482af1442a3ecd7570e7dbbc4ac3bdd` (independent report commit); independently reviewed immutable HEAD `9682f9ce9305ea5242af82418bec7e504bf1ca03` is distinct; fixture/security-design correction commit `496681b307dd71fefedb649d951079557dc431f9`. **97 synthetic fixture definitions (70 original + 27 added, 11 modified); all execution NOT_RUN**. See [final correction report](FINAL-SECURITY-CORRECTION-2026-10-29.md), [KO contract](KO-CREDENTIAL-GATEWAY-CONTRACT.md), [App ACL](APP-AUTHORIZATION-MATRIX.md), [Phase acceptance](CONTRACT-LOCK-ACCEPTANCE-CRITERIA.md). **NEW-P0-01 remains P0 BLOCKER**: 923 Java files in pinned tree but only 64 named controllers/348 annotations previously read, full remaining source-wide audit not completed; runtime Spring routes NOT_RUN. NO SOURCE_ANNOTATION_COMPLETE claim. KO logging mitigations are DESIGN_SPECIFIED, not deployed; metadata/session post-send fixtures now use UNKNOWN remote mutation. Native KO progress, metadataApply, personal bridges, resets and session writes BLOCKED/OFF (design-only). **Independent verdict remains CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.** PR #2 Draft / do not merge; full E2E Phase09 only.

---

# Pinned Official Route Census — CURRENT CORRECTED SCOPE

**Grimmory v3.5.0 @ `402e89b4452f8e2b17ab95f16c1621c003516cd2`: recognized 64 named `*Controller.java` classes / 348 method-level Spring mapping annotations, NOT expanded runtime HTTP routes.** Legacy 56/321 measured **root** `org/booklore/controller` only; App `org/booklore/app/controller` contributes **8/27**. Source completeness for all 923 Java files and runtime mapping NOT_VERIFIED. No SOURCE_ANNOTATION_COMPLETE or RUNTIME_ROUTE_COMPLETE claim.

- [Root parts 1–4](ROUTE-CENSUS-PART-1.md) (56/321; unchanged historical annexes)
- [App routes 8/27](ROUTE-CENSUS-APP.md) and [machine inventory](APP-CONTROLLER-ROUTES.json)
- [Komga 9×5, catchalls, conditional GET](ROUTE-MAPPING-EXPANSION.md)
- [Sensitive route gateway ownership](SECURITY-ROUTE-OWNERSHIP.md)
- [Negative fixture contract](SECURITY-NEGATIVE-FIXTURES.json)
- [Correction report](ROUTE-COVERAGE-SECURITY-CORRECTION-2026-10-29.md), [new review packet](NEXT-INDEPENDENT-REVIEW-PACKET.md)

**Old 56/321 INDEX below is HISTORICAL ROOT-PACKAGE SUBSET, not a complete backend controller census.**

---
# Pinned Official Controller Method-level Route Census — INDEX
**Grimmory Official v3.5.0 commit:** `402e89b4452f8e2b17ab95f16c1621c003516cd2`. All **56** controller files in `backend/src/main/java/org/booklore/controller/*Controller.java` enumerated from pinned recursive Git tree and fetched individually on 2026-10-29. All **321** method-level `@GetMapping/@PostMapping/@PutMapping/@PatchMapping/@DeleteMapping/@RequestMapping` annotations recorded with source path:line: part 1 = **109** (15 controllers), part 2 = **77** (15), part 3 = **72** (15), part 4 = **63** (11).

- [Part 1: AdditionalFile through Bookdrop](ROUTE-CENSUS-PART-1.md)
- [Part 2: CBX through Koreader](ROUTE-CENSUS-PART-2.md)
- [Part 3: KoreaderUser through PdfReader](ROUTE-CENSUS-PART-3.md)
- [Part 4: PublicSettings through Version](ROUTE-CENSUS-PART-4.md)
- [Security route ownership / R-02A policy and negative fixtures](SECURITY-REMEDIATION-2026-10-29.md)
- [Native KOSync no-fork risk decision](../ADR-025-NATIVE-KOSYNC-SECURITY.md)

**Scope honesty:** this is an annotation census, **NOT proof of exact Spring RequestMappingHandlerMapping expansion**. Some `@RequestMapping` annotations can declare multiple values or methods, class prefix parsing may miss special composite paths, and implicit HEAD/OPTIONS plus proxy rewrites/aliases are not included. `@CheckBookAccess` was scanned near the annotation, not a complete service/row ACL proof. Every non-enumerated or unresolved sensitive variant remains DENY/BLOCKED/OFF, never an upstream wildcard fallback. Mandatory Phase02 isolated Spring mapping exporter and diff + Phase02 gateway canonicalization fixtures are outstanding, **NOT_RUN**. Therefore **Route complete from directly observed annotations at these 56 named controllers**, NOT `RUNTIME_ROUTE_COMPLETE`, and not `IMPLEMENTED_VERIFIED`.

**R-02A source highlights:** [BookController:318](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/BookController.java#L318) POST /api/v1/books/reset-progress, [BookController:341](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/controller/BookController.java#L341) POST /api/v1/books/reset-personal-rating. A naive list of existing user progress IDs is **not** proof of assigned-library/content entitlement. [ReadingProgressService:488–494](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/progress/ReadingProgressService.java#L488-L494), [BookUpdateService:336–343](https://github.com/grimmory-tools/grimmory/blob/402e89b4452f8e2b17ab95f16c1621c003516cd2/backend/src/main/java/org/booklore/service/book/BookUpdateService.java#L336-L343).

**Acceptance:** source census readback, 56 files and 321 line mappings, negative reset cases, mutable personal route audit, all gateway method/path cases and UI compatibility, all sensitive OFF until actual implementation/fixtures. Independent reviewer must examine any parser ambiguity, code annotations not covered by the `*Controller.java` naming convention, and source generated routes; otherwise R-02A remains P0 partial. No E2E before Phase09.
