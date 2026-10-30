# Deferred Security Ledger — Single-Owner Private Mode (2026-10-30)

All **independent security review** work is consolidated into **Phase 09**, not individually required at Phases 00–08. This ledger keeps historical security findings and runtime work visible; it never approves a protected feature. Refer to [Policy](SINGLE-OWNER-POLICY.md).

| ID | Origin | Still required before operational enablement / final release | Interim state |
| --- | --- | --- | --- |
| SG-01 | 00/02 | Actual effective Spring URL/method security (HEAD, OPTIONS, OPDS, Kobo, KOReader, Komga, WS), safe prefix routing | 352 mappings/12 chains runtime captured; route forwarding DENY_ALL |
| SG-02 | 02/05 | Official owner login/session, CSRF for browser writes, single-owner device pairing/expiry/revocation, no trusted identity from headers | Local synthetic session crypto only, pairing not wired |
| SG-03 | 02/05/07 | Same-owner book/file/record binding; stale/hash/race, mixed-batch/reset checks, KO progress and safe mutation | Synthetic ACL only; sensitive bridges OFF |
| SG-04 | 02/08/09 | Host-port single ingress, TLS/SNI if crossing trust boundary, IPv4/IPv6, direct-container ingress, Docker egress firewall | Loopback Docker mock only, egress NOT PROVEN |
| SG-05 | 00/02/05 | KO registration and generic upstream logger sanitization, no credential/token in logs | KO forward OFF; mock canary checks only |
| SG-06 | 03/04 | NAS RO mount, safe OPF metadata apply, file integrity, backup/restore/crash and rollback | Phase03 offline fixture OPF/cover dry-run code CI green; real RO NAS mount, race-free traversal and Official writes NOT RUN |
| SG-07 | 05/06/07 | Multi-reader same-owner KOSync, XPointer/CFI and sessions/annotations/queue idempotency | Mock/fixtures only; high-risk writes OFF |
| SG-08 | 08/09 | Dependency/image/config audit, container permission and production secrets | Build and isolated CI only |
| SG-09 | **09** | **One consolidated independent security review + fixes, real hardware/network/identity tests, release owner approval** | NOT RUN; not an interim phase gate |

**Existing evidence:** [Pinned Spring runtime CI #40919840019](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40919840019) succeeded at source `06d3995306d5367b35253874974563b7c9d0cf75` and confirmed **352 actual handlers / 12 ordered chains**, 346 static handler identities present among 403 source candidates. [Phase02 Docker mock CI #40919840017](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40919840017) passed two jobs. Neither proves usable live Official connectivity or production rights.

**Developer continuation:** Do not block Phase03–08 code development merely because independent review has not been performed. Keep protected operations disabled unless their *functional runtime* prerequisites are proven. At Phase09, fix recorded issues in one pass and obtain final independent verification before production.
