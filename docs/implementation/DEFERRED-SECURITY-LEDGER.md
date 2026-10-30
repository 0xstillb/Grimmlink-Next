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

## Phase04 interim evidence (2026-10-30)

Draft PR #8 adds an offline-only Sidecar preview, SQLite durable job/UNKNOWN quarantine, and locally generated metadata-only SHA-256 JSON bundles with restore PREVIEW. No trusted Official mutation transport, authenticated route enablement, real NAS write access, managed reader calls, full-book/cover backup, rollback of Official data or Phase09 E2E has occurred. Review evidence and real operational checks stay deferred to **Phase09**; this checkpoint does not grant runtime enablement.

## Phase04 completion scope — fake/mock only (2026-10-30)

The feature branch adds local per-book plan exclusivity, step receipts and SQLite outbox UNKNOWN quarantine, plus preview/confirm/readback strictly against an isolated memory fake. The fake transport has no live Official URL/token or physical NAS. Backup covers only metadata scalar fields; actual Cover bytes/EPUB/user notes and full Official rollback are **not** supplied. The mock API routes are NOT mounted into the Adapter; trusted owner/CSRF real enforcement, Official CAS and real hardware testing remain deferred. Independent security review + remediation stays Phase09. CI final exact-head must be verified before an owner-authorized integration-only merge.

## Phase05 offline implementation checkpoint (2026-10-30)

[Draft PR #9](https://github.com/0xstillb/Grimmlink-Next/pull/9) adds local SHA-256 book-file evidence and KO digest collision/edition rejection; it **does not prove the KO partial-MD5 algorithm** until the pinned library helper and a real golden EPUB fixture are verified. Single-owner SQLite device tokens are hashed and revocable; authenticated Official owner login/KO credential binding, KO header redaction in real Spring logger and network egress are not connected. MOCK_MANAGED local writer revisions and replay dedupe preserve opaque native position; this is not an Official managed mode or an activated KOSync service. Native progress remains BLOCKED/OFF under ADR-025 due non-atomic Official entitlement check; unmounted HTTP mock factories prove only isolated contracts. Phase09 owns real network, device, file/edition and security E2E plus the single consolidated independent review.

## Phase05 dev closure delta — 2026-10-30

The Phase05 code source `07b49a17` includes offline hashed device tokens, expiry, revocation, transactional rotation and redacted listing; no live session authenticator was connected (SG-02). KOReader filename-mode golden vectors from the pinned v2026.07.1 source and Readest pinned GET schema tests were added (SG-07). **Binary partial MD5 remains unproven against actual EPUB bytes and the uninstalled `@prose-reader/koreader` package**, and CrossPoint TH data is not hardware/protocol verified. Native Official KOSync remains strictly **BLOCKED/OFF** by ADR-025's unresolved atomic entitlement TOCTOU; mock SQLite single-writer CAS is not an approved Official writer (SG-03/07). Protected routes remain unmounted; Official Gateway DENY_ALL; no real KOSync tokens, encrypted secrets, hardware E2E or network deployment. One independent review/remediation in Phase09 only.
