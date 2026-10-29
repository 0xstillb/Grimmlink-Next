## LATEST VERIFIED STATIC EVIDENCE — Phase00 Route Semantics, 2026-10-29 (NOT Independent Approval)

[CI run 40819253130](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40819253130): pinned 923/923 Java bodies SHA-verified and AST parsed (0 errors), 64 Controller markers, 63 class +348 method =411 mapping annotations, **403 static method/path/verb declarations (not runtime route count)**. All method paths resolved; **15 symbolic consumes/produces conditions** remain. **223 security annotation signals**, **15 programmatic** and **2 framework-type signals**; **43 mutation handlers without local annotations** require global/service ACL investigation, not proof of unauthenticated access.

**101 security fixtures** (97 prior +4 WebSocket/static), static validator zero failures; every actual mock/HTTP/security/SQLite test NOT_RUN. [Source auth audit](SOURCE-ROUTE-SEMANTIC-AND-AUTH-REVIEW-2026-10-29.md) details pinned SecurityConfig chains. SOURCE_ANNOTATION_COMPLETE=false; RUNTIME_ROUTE_COMPLETE=NOT_RUN; NEW-P0-01 BLOCKED. CORRECTION_INCOMPLETE / CHANGES_REQUIRED (last independent verdict) / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED. Older checkpoints below are historical when referring to 859 unread Java bodies or 97 current fixtures.

---

# Phase00 Contract Lock — Evidence and Acceptance Criteria (2026-10-29)

**This is an implementer design checklist, NOT permission to lock or start Phase01.** Independent review verdict: `CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED`.

| Gate | Required proof | Owner | Current |
|---|---|---|---|
| Phase00 contract | Classified complete pinned Java route mechanism census and mapping aliases; gateway owner per sensitive route; source→service→repository App entitlement matrix; threat model; correct metadata/session fixtures; explicit disabled capabilities; independent approval | Phase00 | BLOCKED: NEW-P0-01 not complete; review required |
| Phase02 runtime | Executable deny-by-default gateway; Spring runtime exporter, expanded route diff; canonicalization/Host/SNI/rewrite/HEAD/OPTIONS; KO register zero-upstream and secret-free logs; batch fail-closed; direct-ingress impossible in isolated test; per-route auth mocks | Phase02 | NOT_RUN |
| Phase03/04 OPF | Secure OPF parsing, source+target identity and locks, 10 typed scalar fields, exact replaceMode; no CAS/lost-update, no adjacent NAS writes/Sidecar/embedded move, uncertain response handling | Phase03/04 | metadataApply OFF |
| Phase05 identity | KO MD5 vs JWT user binding, rotation, hash collision and edition proof, secret redaction. Native atomic per-book ACL required for GET/PUT or new independent ADR | Phase05 | Native KOSync progress BLOCKED/OFF |
| Phase07 personal+sessions | Per-ID and whole-batch entitlement, library+current content restrictions, own row and file/item identity, transaction-level TOCTOU proof; SQLite WAL/FULL, unique event/hash, durable pre-send reservation, one attempt, crash+lost ACK, UNCERTAIN/no retry | Phase07 | bridges OFF; tests NOT_RUN |
| Phase09 final | Real integrated E2E on Hermes/NAS/readers, cutover/rollback only after preceding phase gates | Phase09 | DEFERRED |

**Never-enable conditions:** No fork/unsafe alternate writer; no native progress without atomic entitlement; no metadata apply without target CAS or independently accepted lost-update prevention; no sessions write before outbox crash evidence; no personal route if any entitlement dimension unproven; no KO registration forwarding; no direct Official backend ingress; no unowned sensitive route; no speculative exactly-once receipt; no merge or Phase01 before fresh independent approval.

**Reviewer checklist:** verify exact start/review/implementer SHAs separately; inspect source/file:line and diff; confirm fixture schema and causal expectations; reproduce source-wide Java scan; explicitly note runtime `NOT_RUN`; ensure no historical reviewer verdict was modified; confirm PR #2 remains OPEN/DRAFT/UNMERGED, integration/main unchanged; issue independently signed verdict in separate fresh session.
