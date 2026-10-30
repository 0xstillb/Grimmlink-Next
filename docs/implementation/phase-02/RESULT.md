> **Policy override, 2026-10-30:** [Single-Owner Private Mode](../SINGLE-OWNER-POLICY.md). **No mandatory independent security review during Phase00–08.** The single consolidated independent review/fix pass is Phase09. Keep historical review findings as immutable records, not current development blockers; protected Official routes still remain OFF until actually safe to enable.

# Phase 02 — Gateway, Auth & Official REST Client (DEVELOPMENT DELIVERED; MOCK-ONLY)

## Development closure — 2026-10-30 (Single-Owner Private)

**Development disposition:** `DEV_CHECKS_PASS_WITH_DEFERRED_RISKS`. This closes the **Phase02 isolated implementation/handoff** only, using the owner's revised [00–09 matrix](../PHASE-MATRIX.md). The original `GATEWAY_CODE_REVIEWED` / independent security signoff was superseded as an *intermediate process gate*. **Operational disposition remains `BLOCKED_OPERATIONAL_ENABLEMENT`**, not live proxy acceptance.

- One host-loopback Caddy port `127.0.0.1:6060`, Adapter in shared namespace `127.0.0.1:6061` without a second published port; all Official UI/API/OPDS/KO/Kobo/Komga routes remain `DENY_ALL`.
- Typed fake-only Official client plus separately unexposed bounded loopback HTTP implementation, Admin/Reader HMAC and CSRF pure-policy checks, fail-closed synthetic same-owner entitlement checks, runtime route registry probe and anti-forged security gate.
- Added a local read-only `GET /api/grimmlink/v2/version` manifest reporting adapter `0.1.0`, API `v2`, `MOCK_ONLY`, `officialConnected=false` and `NOT_AUTHORIZED`; it is **not** an Official version or health probe. Includes negative method and mock Caddy HTTP tests.
- **Verified pre-manifest code HEAD `e34038b`:** Phase00 [#40982860327](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40982860327), Phase01 [#40982860331](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40982860331), Phase02 Gateway [#40982860289](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40982860289), Spring [#40982860296](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40982860296) — **SUCCESS at that exact earlier SHA**.
- **Version-manifest implementation** at `3ce5a5f` and this follow-up handoff must receive **separate exact-HEAD CI confirmation**; do not transfer the earlier code's PASS to later commits. Local runtime tests in this ChatGPT session were not run; GitHub Actions is the executable evidence.
- Preserved historical Phase01 review/attestation while transitioning ACTIVE to Phase02; Phase00 gate now checks the historical evidence during Phase02 and never promotes runtime authorization.

**Phase09 retained obligations:** Official authenticated proxy, live session/device pairing and revocation, actual matcher/method/path and same-owner book/file/record authorization, TLS/IPv4/IPv6/egress isolation, KO secret-safe logging, physical Hermes/NAS/readers tests, independent consolidated security review and remediation. No unsafe feature enabled. PR #6 remains Draft/unmerged, no production or `main` merge.

### Historical implementation checkpoints

## CURRENT — Pinned real Spring runtime captured; real ACL/ingress still blocked (2026-10-29)

**Actual Spring startup evidence:** [CI #40918459916](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40918459916) SUCCESS at exact implementation source `30b7d22c2297d2e022dd68538c4fc26072606080`, pinned Grimmory `402e89b4452f8e2b17ab95f16c1621c003516cd2`, isolated Java25 + H2. `RequestMappingHandlerMapping` reported **352** runtime handlers, `FilterChainProxy` exposed **12 ordered filter chains**; **346 distinct source handler identities** from the 403 source route candidate ledger were found in runtime. [Runtime artifact #12918045157](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40918459916#artifacts) includes mapping/filter registry, pinned runtime OpenAPI and handler-level reconciliation. **This proves boot-time mappings/chains exist, NOT effective authorization per HTTP method/path, content rights, live identity, device pairing or safe upstream forwarding.**

**Other code:** pinned-source runtime probe and reconciler, user-bound HMAC Admin/Reader session crypto (OFF/not wired), bounded loopback-only HTTP transport (not exported/wired), injected mock Official client, pure Admin CSRF/Owner ACL, one-port Caddy mock and negative HTTP/credential log tests. [Phase02 Gateway CI #40919435611](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40919435611) SUCCESS at code source `add509230058d2d033690445b0cd733fa744a141`. [Phase00 integrity #40919435185](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40919435185) SUCCESS design-only at same source. Future docs HEAD must pass separate exact-HEAD checks.

**Security verdict:** `SPRING_RUNTIME_METADATA_CAPTURED / GATEWAY_CODE_REVIEWED_NOT_GRANTED`. `RUNTIME-SECURITY-EVIDENCE.json` now truthfully records partial real proof with CI provenance; `runtime_security_gate.py` still blocks forged APPROVED state and requires independent current per-user/library/book/file/row rights + actual ingress/TLS/device session runtime authorization and separate fresh-context review. All Official forwarding `DENY_ALL`, sensitive bridges OFF, production NOT_AUTHORIZED, full E2E Phase09. [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4). PR #6 DRAFT/UNMERGED.

---


## Current checkpoint — Executable Single-Port MOCK Gateway (2026-10-29)

**Phase02 exit gate:** `GATEWAY_CODE_REVIEWED` **NOT GRANTED**; reviewer and real Spring runtime owner signoff remain outstanding. **No production or live Official forwarding**.

### New code & configuration

- `gateway/Caddyfile.phase02.mock` + `gateway/Dockerfile.mock`: constrained loopback host 6060 Caddy, Caddy admin OFF, no Official upstream, exact local GET path allowlist and 403/421 default deny. Caddy file capabilities are stripped for safe `cap_drop: ALL` under non-root user; no blanket privilege relaxation.
- `compose.phase02.mock.yml`: one host-published `127.0.0.1:6060` only, Adapter in Gateway network namespace on loopback 6061 (never exposed to host or peer containers), read-only/rootless services and bounded logs. Docker bridge is required for local host ingress; **egress isolation is NOT PROVEN**. This Compose **must not be deployed to LAN or production**.
- `apps/adapter/src/auth/synthetic-acl.ts` + tests: all-or-none, fail-closed synthetic checks for current user, library, book, child file, record, stale/revoked and unsafe batch; never authorizes a real Official route or claims atomic upstream enforcement.
- `scripts/phase-02/runtime_security_gate.py` + negative tests + `RUNTIME-SECURITY-EVIDENCE.json`: machine gate that explicitly blocks forged Spring runtime PASS and requires actual proofs; current receipt is `NOT_RUN`.
- `.github/workflows/phase02-gateway.yml`: real isolated Docker Caddy/Adapter mock HTTP tests with single-port/host/port isolation/denial checks, plus frozen workspace unit/mocks and runtime gate integrity tests. The later additional canary log-sink, sensitive-GET and admin-write HTTP fixtures require a new exact-HEAD CI readback.

### CI evidence

- [Phase02 isolated gateway CI #40905567097](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40905567097) **SUCCESS** at source SHA `150bd87f471b242903c8da1147597afffcb29af6`: both `gateway-mocks` and `single-port-mock` jobs passed (Caddy/adapter started, HTTP/capabilities and deny paths tested). This is the **last verified pre-follow-up code SHA**, not the HEAD after later fixtures/docs.
- The initial internal Docker network prevented host ingress (curl status 000), corrected to loopback-published bridge with egress limitation documented. Prior Caddy Host header-regexp incorrectly returned 421 to valid host; corrected to Caddy `host` matcher. Earlier failed CI checkpoints are not masked by the final PASS.
- [Phase00 source gate #40905566812](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40905566812) **SUCCESS** for the same earlier SHA; its acceptance remains DESIGN-ONLY.
- Extended Phase02 mocked HTTP + canary log-sink + foreign book/file/record denial: [Phase02 Gateway #40906176839](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40906176839) **SUCCESS (both jobs)** at source `69ded85e584263f885ce51a2a322adc0d20ce60e`. [Phase00 integrity #40906176944](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40906176944) **SUCCESS (design-only)** at the same source SHA. The subsequent handoff document commit requires its own exact-head CI.

### Why Phase02 cannot truthfully be called fully complete

The mock-only configuration deliberately cannot proxy Official UI/API/OPDS/Kobo/KO/Komga or guarantee WebSocket/SSE/Range backward compatibility without exact route ownership and live Spring authorization. There is no live authenticated session issuer, real account/device mapping, or current same-user per-book/file/row atomic proof. Caddy auto-HTTPS is disabled *only because* the tested listener is loopback; there is no public TLS/SNI or IPv6 production test. Docker bridge egress is not proved isolated. Full real Hermes/NAS/readers E2E belongs solely to Phase09. Explicit blockers and fresh-context review request: [INDEPENDENT-REVIEW-REQUEST.md](./INDEPENDENT-REVIEW-REQUEST.md) and [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4).

No merge, production cutover, new Official forwarding allowlist or Phase02 acceptance is authorized.

---


## Follow-up — Typed mocked Official read + separated Auth contract (2026-10-29)

**Implementation HEAD:** See [Draft PR #6](https://github.com/0xstillb/Grimmlink-Next/pull/6) for live branch SHA; this section does not self-attest its own commit. **Phase02 exit gate still OPEN; no code-review approval.**

### Newly implemented

- `packages/official-client/src/mock-transport.ts`: typed mock-only Official GET transport with explicit mock injection (no global fetch), strict origin-relative path/correlation/scope validation, 1–3 bounded attempts, aborting timeout, idempotent GET-only retry for transient failures, sanitizer-safe errors without upstream text or secrets. `isMockVersionCapabilities` validates a **synthetic capability DTO only**, not a confirmed Official endpoint.
- `packages/official-client/src/index.ts`: existing live client stays disabled and the mock-only contract is separately exported; no admin JWT, KO key or cookie propagation.
- `apps/adapter/src/auth/policy.ts`: pure authorization contract for verified Admin mutations (exact Origin plus server-session-bound SHA256 CSRF) and separate same-owner Reader identity. Admin cannot inherit Reader permissions. **No live session resolver, login or HTTP mutation endpoint is enabled**.
- New `mock-transport.test.ts` and `auth/policy.test.ts`: simulated timeout, transient retry, terminal 401/403/404, malformed/credential-bearing DTO, scope/path checks, CSRF, expiration and cross-user refusal.
- Gateway `route-policy.ts` and tests: deny Range, WebSocket upgrade, SSE and proxy auth/header variants before any forwarding; Official remains `DENY_ALL`.

### Validation and gates

- Preceding bootstrap code commit `f1b6624` passed [Phase02 isolated CI #40899699146](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40899699146) and [Phase00 gate #40899699256](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40899699256) (source-specific, **not** coverage of this new code).
- **New mock-only/Auth/gateway changes:** [Phase02 CI #40902172141](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40902172141) **SUCCESS** and [Phase00 integrity #40902171900](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40902171900) **SUCCESS** at exact pre-handoff code+docs SHA `f3b0d8791a97c739f22459b3c5fd15cc2c7098aa`; later handoff commits must receive separate exact-HEAD CI. No successful E2E or live auth claim.
- Existing hard security blockers under [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4) remain: Spring runtime chains, route owner/record entitlement, direct ingress isolation and single-port Caddy validation, end-to-end mocked Range/WS/SSE compat, real Admin session verifier/device pairing, independent security review.
- No production or upstream forwarding and no full Hermes/NAS/reader integration before Phase09.

---


**Date:** 2026-10-29
**Base:** `integration/grimmlink-next` at `0579f64afb2d53001c915a10079d00ecd9de0091` (merged Phase01 technical foundation).
**Branch:** `feat/next-phase-02`
**Draft PR:** https://github.com/0xstillb/Grimmlink-Next/pull/6
**Notion specification:** https://app.notion.com/p/407c7efbc00981f7889effadc1c5ffd7
**Exit gate:** `GATEWAY_CODE_REVIEWED` — **NOT GRANTED**.

## Code in this checkpoint

- `apps/adapter/src/gateway/route-policy.ts`: fail-closed origin-form route classifier, no decoding/rewrite, explicit method-only local read allowlist; all Official/UI/OPDS/KOReader/App routes denied before forwarding.
- `apps/adapter/src/server.ts`: Fastify `onRequest` pre-body rejection (400 for ambiguous targets/forwarded rewrite headers; 403 for unapproved routes). No Official client wired, no upstream transport.
- `/api/grimmlink/v2/capabilities`: generated OpenAPI response truthfully reports Official disconnected, Gateway `DENY_ALL`, native progress/personal bridge OFF, E2E deferred to Phase09. `/health` retains Phase01 local-process semantics.
- `apps/adapter/src/gateway/route-policy.test.ts` and `apps/adapter/src/server.test.ts`: unit and Fastify.inject mock-negative cases for method confusion, encoded separators, dot segments, forwarded headers and synthetic KO secrets.
- `.github/workflows/phase02-gateway.yml`: deterministic isolated CI (frozen pnpm, build/typecheck/lint/format and unit/injected mocks), no real backend or hardware.

## Test accounting

- [Phase02 isolated CI #40899384263](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40899384263): **SUCCESS** at exact code source HEAD `83f5a80eba3dacabf3739cc46fb4f59e21a1d58a`. Frozen install, native SQLite binding, build, strict TypeScript, ESLint, Prettier, injected mock/unit tests and no-second-port contract checks all passed. This is not runtime authorization or Phase09 E2E.
- [Phase00 per-HEAD gate #40899384123](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40899384123): **SUCCESS** at same code source HEAD, preserving design-lock and deny-all invariants. Later documentation commits require new exact-HEAD checks.
- No standalone local test runner used in this GPT Web session.
- Source route inventory 403 is a Phase00 **static candidate count**, NOT a number of runtime-forwarding approvals or completed executable ACL tests.
- Direct Official upstream calls: **NOT EXECUTED** (no transport wired).
- Real Official / NAS / Hermes / physical reader / full integrated E2E: **DEFERRED TO PHASE09**.

## Open HARD blockers (Issue #4)

1. Isolated live Spring `RequestMappingHandlerMapping` + ordered `SecurityFilterChain` exporter and source/runtime route diff, including HEAD/OPTIONS, `/api/v1/opds`, aliases, static and WebSocket.
2. Caddy/existing gateway single publicly published :6060 plus validated host/SNI, Docker/IPv4/IPv6 direct-ingress isolation; no additional public ports.
3. Exact allowlist ownership, zero-upstream negative tests for current user/library/book/file/row entitlement, reset batches and sensitive GET. 403 source candidates remain DENY until independently proven.
4. Authenticated admin and CSRF, separate user/device auth. KO registration must remain blocked before body forwarding; synthetic log-sink secrets/headers and error paths require executable receipts.
5. Typed Official REST DTO/version/probe client, sanitized transport and idempotent-only retry in fake upstream; Range/WebSocket/SSE/cookie/redirect mocked compatibility.
6. Complete code/tests, exact-head CI success and **separate fresh-context** line-level independent review; no implementer self-PASS.

## Safety

`officialGatewayForwarding=DENY_ALL`, `nativeKosyncProgress=OFF`, `metadataApply=OFF`, `personalBridge=OFF`, `sessionBridge=OFF`, `resetProgress=OFF`, `managedProjection=OFF`, `productionDeployment=NOT_AUTHORIZED`.

This is an initial implementation checkpoint only, not the Phase02 exit gate or deployable Gateway authorization.
