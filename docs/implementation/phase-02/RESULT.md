# Phase 02 — Gateway, Auth & Official REST Client (IN PROGRESS)

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

- Phase02 CI: **PENDING / re-read exact live PR head and jobs before claiming any result**.
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
