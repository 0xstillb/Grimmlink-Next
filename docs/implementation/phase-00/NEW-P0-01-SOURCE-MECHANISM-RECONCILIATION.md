# NEW-P0-01 pinned source mechanism reconciliation — implementation and verification

**Scope:** close the outstanding *source inventory* portion of NEW-P0-01 without claiming that Spring runtime, entitlement or Gateway authorization is verified. The original P0 finding remains security-open until its separate reviewer adjudicates whether Phase00 accepts design-only inventory with Phase02 security hard gates.

## Evidence

- Pinned Grimmory `402e89b4452f8e2b17ab95f16c1621c003516cd2` and 923 Java source bodies SHA verified + AST parsed. 64 controller markers, 63 class mappings, 348 method-level annotations → 403 source method/path/verb candidates (not runtime routes); 15 source constants previously resolved.
- The new [source mechanism auditor](../../../scripts/phase-00/audit-route-mechanisms.py) re-hashes all 923 bodies and fails if an unaccounted registration/alternate endpoint mechanism or custom source annotation definition appears. It owns the 17 non-HTTP annotation programmatic/type signals: seven WebMvc calls + its framework implementation, six WebSocket calls + its framework implementation, and two SecurityConfig CORS calls. 11 other inheritance subtypes are examined as non-HTTP candidates by their explicit base types; all 160 inherited/interface flags are checked and any untracked web-facing base type must fail.
- Existing [repository evidence](REPOSITORY-REST-SOURCE-EXPOSURE.json) checks 65 repositories, pinned Gradle dependency and all 923 Java files for Spring Data REST indicators, not Spring runtime absence.
- All 348 handler records remain deny-by-default under [source ownership ledger](SOURCE-AUTH-OWNERSHIP-LEDGER.json); 43 priority mutation handlers have source witness reviews; **zero are approved for forwarding**.
- No alternate endpoint annotation events were observed in pinned AST. The scanner detects suspicious route technologies (Servlet/JAX-RS/GraphQL/RouterFunction/functional Spring HTTP/HTTP Exchange) as a failing source-recheck, not an allow fallback.
- No Official source is modified. Check CI **pinned-source-ast-census** for the exact commit: new command generates a deterministic `NEW-P0-01-SOURCE-MECHANISM-EVIDENCE.json` from PINNED source into an Actions artifact. New negative unit tests check web-config, JPA repository, unexpected Servlet and functional routes.

## Precise unresolved facts

- `SOURCE_ANNOTATION_COMPLETE` remains false in historic census because syntax-only Java AST does not bind every runtime inherited Spring route. The new derived *source mechanism inventory* may be marked `RECONCILED_FOR_PINNED_SOURCE` **if and only if the CI step succeeds**; it is NOT permission to flip runtime completeness.
- Spring `RequestMappingHandlerMapping`, `SecurityFilterChain` and effective `/api/v1/opds` double-star root behavior **NOT_RUN**. WebSocket handshake/STOMP, static `/**`, Komga/Kobo catchalls and mapped aliases still need deny-by-default executable Gateway coverage.
- Direct ingress/IPv6/Host/SNI aliases, user-library/book/content/file/row current rights, KO secret-free logging and negative HTTP mocks are **Phase02/05/07** and remain unproven. Do not expose or forward a route. Full real Hermes/NAS/readers E2E is Phase09.
- This is a source audit by the implementer, **not an independent reviewer PASS**. Existing independent `CHANGES_REQUIRED`, `phase00ContractLocked=false`, `phase01Authorized=false` and Draft PR #2 are unchanged.

**Decision:** NEW-P0-01 *source-only census* can be complete on green exact-head CI. Complete NEW-P0-01 security acceptance and Phase00 lock still require genuinely separate reviewer acceptance of Phase00-vs-Phase02 evidence boundaries, or additional evidence if the reviewer rejects deferral.
