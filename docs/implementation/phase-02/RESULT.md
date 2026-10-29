# Phase 02 — Gateway, Auth & Official REST Client (IN PROGRESS)

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
- **New mock-only/Auth/gateway changes:** exact latest-HEAD CI must be checked independently; **PENDING/NOT YET ATTESTED** at this documentation checkpoint. No successful E2E or live auth claim.
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
