# Phase02 — fresh-context independent security review request

## CURRENT — Pinned real Spring runtime captured; real ACL/ingress still blocked (2026-10-29)

**Actual Spring startup evidence:** [CI #40918459916](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40918459916) SUCCESS at exact implementation source `30b7d22c2297d2e022dd68538c4fc26072606080`, pinned Grimmory `402e89b4452f8e2b17ab95f16c1621c003516cd2`, isolated Java25 + H2. `RequestMappingHandlerMapping` reported **352** runtime handlers, `FilterChainProxy` exposed **12 ordered filter chains**; **346 distinct source handler identities** from the 403 source route candidate ledger were found in runtime. [Runtime artifact #12918045157](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40918459916#artifacts) includes mapping/filter registry, pinned runtime OpenAPI and handler-level reconciliation. **This proves boot-time mappings/chains exist, NOT effective authorization per HTTP method/path, content rights, live identity, device pairing or safe upstream forwarding.**

**Other code:** pinned-source runtime probe and reconciler, user-bound HMAC Admin/Reader session crypto (OFF/not wired), bounded loopback-only HTTP transport (not exported/wired), injected mock Official client, pure Admin CSRF/Owner ACL, one-port Caddy mock and negative HTTP/credential log tests. [Phase02 Gateway CI #40919435611](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40919435611) SUCCESS at code source `add509230058d2d033690445b0cd733fa744a141`. [Phase00 integrity #40919435185](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40919435185) SUCCESS design-only at same source. Future docs HEAD must pass separate exact-HEAD checks.

**Security verdict:** `SPRING_RUNTIME_METADATA_CAPTURED / GATEWAY_CODE_REVIEWED_NOT_GRANTED`. `RUNTIME-SECURITY-EVIDENCE.json` now truthfully records partial real proof with CI provenance; `runtime_security_gate.py` still blocks forged APPROVED state and requires independent current per-user/library/book/file/row rights + actual ingress/TLS/device session runtime authorization and separate fresh-context review. All Official forwarding `DENY_ALL`, sensitive bridges OFF, production NOT_AUTHORIZED, full E2E Phase09. [Issue #4](https://github.com/0xstillb/Grimmlink-Next/issues/4). PR #6 DRAFT/UNMERGED.

---


**Draft PR:** https://github.com/0xstillb/Grimmlink-Next/pull/6
**Source pin:** always fetch LIVE HEAD; never inherit earlier CI result.
**Target:** `integration/grimmlink-next`; **no merge authorization**.
**Notion source:** https://app.notion.com/p/407c7efbc00981f7889effadc1c5ffd7
**Hard gates:** https://github.com/0xstillb/Grimmlink-Next/issues/4

## Review scope and evidence classification

1. Inspect complete PR #6 diff, `apps/adapter/src/server.ts`, `gateway/route-policy.ts`, `auth/policy.ts`, `auth/synthetic-acl.ts`, `packages/official-client/src/mock-transport.ts`, Caddyfile/Compose and CI tests, with file:line findings.
2. Distinguish **live network forwarding** (intentionally absent) from **isolated fake Caddy → adapter routing**, and synthetic rights snapshots from actual current per-book/content authorization.
3. Challenge Caddy path/host matcher ordering, alternate path forms, HTTP HEAD/OPTIONS/Range/WS/SSE, identity/forwarded headers, host and direct IPv4/IPv6/container ingress, accidental egress, no second host port, Caddy/Adapter container hardening.
4. Verify `POST /api/koreader/users/create` is denied before parsing/forwarding credentials, no KO passwords/JWT/userData in response, Fastify logs or Caddy logs. Examine both successful and failed paths.
5. Challenge admin origin/CSRF and reader user-bound identity. **Pure policy functions do not prove a live authenticated session or atomic Official entitlement**, which are still disabled.
6. Inspect bounded GET-only retry, response validation, timeout/abort and secret-safe errors of mock REST client. No live Official URL, secrets or credential forwarding is authorized.
7. Verify Phase00 `403` source mapping variants remain documentary **DENY**, not evidence of Spring `RequestMappingHandlerMapping` or real `SecurityFilterChain`. Verify `scripts/phase-02/runtime_security_gate.py` fails closed on missing proof and forged approvals.
8. Read current exact-HEAD GitHub Actions, not only prior commit CI receipts. No full hardware/Official/NAS/reader E2E before Phase09.

## Required explicit verdict

Use **CODE_MOCK_SCOPE_REVIEWED** only if the exact code & isolated tests support it. `GATEWAY_CODE_REVIEWED` must remain **BLOCKED** unless complete approved Phase02 runtime evidence exists (live Spring mappings, chain ordering, current per-record rights, direct ingress, credential-safe logging and owner signoff). Independent reviewer cannot create missing evidence by textual assertion.

Publish review to PR with exact SHA, affected file/line citations, severity, reproduction, corrected evidence, tests actually run and explicit `NOT_RUN` items. **Do not treat a comment by this implementing context as independent review.**

## Open external gates

- No runtime Spring export from pinned Grimmory executable; source scans are static.
- No authorized direct Official backend ingress/IPv4/IPv6/container proof with real services.
- No reliable same-user atomic current book/file/row entitlement for Official forwarding.
- No live admin login/session issuer/device binding to Official identity.
- No physical Hermes/NAS/KOReader/Readest E2E (Phase09).
- No independent fresh-context Phase02 verdict or human integration authorization.

All sensitive capabilities remain `OFF`; Official forwarding remains `DENY_ALL`, production `NOT_AUTHORIZED`.
