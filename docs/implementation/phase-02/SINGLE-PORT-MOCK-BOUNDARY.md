# Phase02 single-port boundary — mock-only topology

This is a **configuration + isolated local test fixture**. It is not a deployed Gateway and does not authorize real Official traffic.

- Caddy is the only host-published listener: `127.0.0.1:6060`; *not* a LAN/public deployment.
- Adapter process binds `127.0.0.1:6061` inside the shared Caddy network namespace. It has **no second host-published or directly addressable container port**.
- Caddy admin API is OFF, auto-HTTPS OFF (loopback-only), container read-only, unprivileged, no-new-privileges, all caps dropped; loopback-only Docker bridge has no Official service or NAS mounted. Docker egress isolation is **NOT PROVEN** and remains an explicit runtime security blocker.
- Caddy permits only the three explicitly named local GET routes; all other methods/routes including `/api/koreader/users/create`, `/api/v1/opds`, `/ws`, file/content, root and `/grimmlink` deny 403.
- Host outside `localhost:6060` / `127.0.0.1:6060` denies 421. Headers for auth and forwarding are stripped; Fastify checks the same strict local routes independently.
- No Caddy arbitrary fallback, URI rewrite, Official reverse proxy or route delegation; no leaked credentials.
- Mock-only Caddy does **not** implement Official UI/OPDS compatibility. Enabling those routes still requires real effective Spring matcher decisions and current same-owner book/file/record binding. **Phase02 development gate is delivered; operational forwarding gate remains BLOCKED**.
- No TLS certificate or SNI assurance. **Do not publish to LAN or change loopback bind before separate ingress/TLS security acceptance.**
- The local GET-only version manifest at `/api/grimmlink/v2/version` reports `MOCK_ONLY` and `NOT_AUTHORIZED` without querying the Official backend. Unknown methods/Official paths remain denied.\n- Full integrated real Official/Hermes/NAS/reader E2E remains Phase09 only.

Isolated executable **Caddy config parse, Compose validation and Docker mock HTTP/host/protocol denial tests** have passed at pre-version-manifest HEAD `e34038b` ([Gateway CI #40982860289](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40982860289)). New version fixture and this later HEAD require their own CI. Real-deployment IPv4/IPv6 direct ingress, TLS/SNI, Docker egress, Official authorization and final independent security review are **not proven** and remain deferred operational gates for Phase09.
