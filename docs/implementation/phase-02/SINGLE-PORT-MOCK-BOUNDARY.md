# Phase02 single-port boundary — mock-only topology

This is a **configuration + isolated local test fixture**. It is not a deployed Gateway and does not authorize real Official traffic.

- Caddy is the only host-published listener: `127.0.0.1:6060`; *not* a LAN/public deployment.
- Adapter process binds `127.0.0.1:6061` inside the shared Caddy network namespace. It has **no second host-published or directly addressable container port**.
- Caddy admin API is OFF, auto-HTTPS OFF (loopback-only), container read-only, unprivileged, no-new-privileges, all caps dropped; loopback-only Docker bridge has no Official service or NAS mounted. Docker egress isolation is **NOT PROVEN** and remains an explicit runtime security blocker.
- Caddy permits only the three explicitly named local GET routes; all other methods/routes including `/api/koreader/users/create`, `/api/v1/opds`, `/ws`, file/content, root and `/grimmlink` deny 403.
- Host outside `localhost:6060` / `127.0.0.1:6060` denies 421. Headers for auth and forwarding are stripped; Fastify checks the same strict local routes independently.
- No Caddy arbitrary fallback, URI rewrite, Official reverse proxy or route delegation; no leaked credentials.
- Mock-only Caddy does **not** implement Official UI/OPDS compatibility. Enabling those routes requires signed runtime Spring chain/mapping and current user/library/content ownership proof. Phase02 exit gate stays **NOT GRANTED**.
- No TLS certificate or SNI assurance. **Do not publish to LAN or change loopback bind before separate ingress/TLS security acceptance.**
- Full integrated real Official/Hermes/NAS/reader E2E remains Phase09 only.

Pending executable validation: Caddy config parse, Compose config, isolated Docker HTTP/host/protocol tests, IPv4/IPv6 host ingress tests, and independent security review. Static files alone are not runtime validation.
