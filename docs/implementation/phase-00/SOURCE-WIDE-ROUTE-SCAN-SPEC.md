# Source-wide Java Route Census — Reproducible Gate (NEW-P0-01)

**Pinned repo:** [Grimmory commit 402e89b...](https://github.com/grimmory-tools/grimmory/tree/402e89b4452f8e2b17ab95f16c1621c003516cd2). Git tree fetched, `truncated=false`: **923** Java paths under `backend/src/main/java/org/booklore/`. Last reviewer independently read **64 named controllers / 348 method-level annotations**. These are not expanded paths. THIS CORRECTION SESSION did not fetch and text-scan the 859 remaining Java files: source-wide assertion remains **UNVERIFIED**, `SOURCE_ANNOTATION_COMPLETE=false`, `RUNTIME_ROUTE_COMPLETE=NOT_RUN`. Do NOT downgrade P0.

## Reproduction protocol

1. Checkout exact pinned SHA, hash and inventory every `org/booklore/**/*.java` from immutable git tree; fail if any file unreadable. Capture per-file Git blob SHA and scan receipt.
2. Scan ALL files (not only `*Controller.java`) using AST plus manual review for `@Controller`, `@RestController`, method/class `@RequestMapping`, verb mappings, composed/custom method aliases, meta-annotations, `RouterFunction`/`RouterFunctions`, servlets, filters, `WebMvcConfigurer`, `HandlerMapping`, `@Bean` endpoint registration, Actuator/framework/generated endpoints. Record path/line, class, mechanism, annotations, alias expansion, conditions and auth chain.
3. Expand multi-path × explicit methods. Class conditions, params, headers, consumes/produces and route specificity remain first-class; do not flag `AdditionalFileController` `params=isBook` as false collision. Examine Komga 9×5 plus catchall, Kobo catchall.
4. Write per-handler machine JSON with pinned SHA, file SHA, path:line, method, conditions, authorization ownership, acceptance evidence. Unknown/sensitive route class = DENY; no generic wildcard allow.
5. Phase02 (not Phase00 assertion) isolated Spring `RequestMappingHandlerMapping` exporter with `RequestMappingInfo` for path/HTTP method/params/headers/consumes/produces, plus functional servlets/Actuator mappings; compare all runtime routes and gateway normalized aliases. Treat HEAD/OPTIONS, rewrite, forwarded host/SNI and direct ingress as distinct cases.

**Phase00 acceptance:** exhaustive source-backed classified ledger OR explicit BLOCKED P0; no contract lock if source-sensitive variants remain unowned. **Phase02:** runtime exporter/mock negative cases, not Phase09 full integrated E2E. Current status `NEW-P0-01=CORRECTION_PARTIAL`.
