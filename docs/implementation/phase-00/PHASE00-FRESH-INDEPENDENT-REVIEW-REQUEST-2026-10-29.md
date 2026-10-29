# GrimmLink Next — Fresh Independent Phase 00 Review Request (2026-10-29)

**Status:** REQUEST ONLY, not independent approval. Historical independent verdict **CHANGES_REQUIRED**. Never approve Phase01 from implementer evidence.

- Branch: feat/next-phase-00; [Draft PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2) remains open/unmerged, base integration/grimmlink-next.
- Official upstream pinned: grimmory-tools/grimmory@402e89b4452f8e2b17ab95f16c1621c003516cd2.
- Last independently reviewed HEAD: 9682f9ce9305ea5242af82418bec7e504bf1ca03. Independent reviewer must fetch **live feature HEAD** and inspect all intervening diffs.
- Historical immutable reviewer report Git blob: 085c8bedb16513df38575fcff2a432ab72de2ad8. Do not edit or replace historical reviews.

## Reproducible implementer source evidence (NOT security authorization)

| Evidence | Verified | Limitation |
| --- | --- | --- |
| Java census | 923/923 source blobs SHA-verified and Java AST parsed; 0 parse errors | Spring runtime registration NOT_RUN |
| Method mapping records | 348 source annotations; only 346 unique method names, two overload collisions | Never index mappings solely by method name |
| Source method/path/verb declarations | 403/403 classified against pinned SecurityConfig candidate source patterns | Not actual runtime registered routes |
| Symbolic conditions | 15/15 source constants pinned to Official or locked Spring | Runtime classpath matching NOT_RUN |
| Source Security chains | 403 chain candidates, ALL have Gateway DENY | Root /api/v1/opds double-star match and actual chain precedence NOT_PROVEN |
| Source auth priority | 43/43 handlers have source-backed dispositions; 6 Critical/29 High/4 Medium/4 Low source triage | Zero authorized, not CVSS or observed exploit severity |
| All handler owners | 348/348 method mapping records documented deny-by-default | Current per-book/user content/record and ingress NOT_PROVEN |
| Inheritance | 160 extends/implements files classified; 65 repositories, 2 Web Config | Type-bound runtime inherited mappings NOT_PROVEN |
| Repository REST | No direct Spring Data REST dependency/source indicators in pinned build and 923 Java files | Other exposure mechanisms not ruled out |
| Synthetic fixtures | 109 unique cases, 0 static validation failures | Actual mock HTTP/Gateway/log-sink/SQLite/concurrency/E2E NOT_RUN |
| Independent review | Historical report unchanged, historical verdict CHANGES_REQUIRED | Fresh review NOT_RUN |

Supporting proof:
- [CI — 43/43 source authorization](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40830006159)
- [CI — 109 static security fixtures](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40830218540)
- [CI — 403 source Security Chain candidates](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40831672425)
- [CI — machine-verifiable release gate](https://github.com/0xstillb/Grimmlink-Next/actions/runs/40831960179)
- [Machine-readable release gates](PHASE00-GATE-STATUS.json)
- [403 source candidate decision ledger](SOURCE-403-SECURITY-CHAIN-CANDIDATES.json)
- [43 authorization dispositions](AUTH-43-REVIEW-DISPOSITION.md)
- [Phase00 source and security acceptance rules](CONTRACT-LOCK-ACCEPTANCE-CRITERIA.md)

## Source-derived security concerns to adjudicate

1. KoboController has a mutable per-request token field, possible cross-request mixing under normal singleton controller scope; concurrency is not yet tested.
2. KO registration handler logs userData at WARN, and Official generic request logging includes payload/headers with no explicit x-auth-key/x-auth-user exclusion; deny before proxy and prove no secret sink.
3. ReadingProgressService resolves nested bookFileId separately from requested bookId; verify cross-book file ID and current content entitlement before any write.
4. KOReader resolves bookHash without demonstrated current assigned-library/content proof in inspected save method.
5. MagicShelf new public creation accepts public flag without explicit admin check in reviewed create path.
6. Kobo reading-state body entitlement IDs are not shown bound to path bookId/current content entitlement.
7. Initial admin setup checks existence before provisioning; concurrency/atomicity protection remains unverified.
8. Public/auth-exempt, WebSocket/STOMP, OPDS root, media/download and fallback permitAll patterns require actual Spring matcher and ingress test.
9. All App personal/reset writes, KO progress, metadata apply and session write capabilities remain OFF/BLOCKED.

Findings are source-level risks, not claims of observed production exploitation.

## Reviewer must independently decide the Phase00 versus later-phase boundary

Phase02 owns runtime Gateway, route exporter, direct Official ingress isolation, canonical/alias behavior, KO redacted logging and mock HTTP. Phase05 owns KO identity. Phase07 owns personal access/outbox durability. Phase09 owns final Hermes/NAS/reader E2E.

**Explicit question for a fresh separate reviewer:** Can the Phase00 architecture/contract be approved with every sensitive feature OFF and the above future-phase requirements hard gated? Or does NEW-P0-01 source annotation/ownership completeness and the identified risks mean CHANGES_REQUIRED even for a design-only Phase00? The reviewer must interpret the accepted Phase00 criteria, not waive them merely to start Phase01.

The reviewer must issue a NEW independently authored report naming exact reviewed HEAD, specific file/line evidence, disposition for NEW-P0-01 and R-02A/R-01/R-02/R-09/R-11, two overloaded method identities, contract gate logic and tests, plus **PASS or CHANGES_REQUIRED**. If CHANGES_REQUIRED, distinguish strictly Phase00 blockers from deferred Phase02–09 requirements. Do not overwrite historical reviewer reports.

**Until a separate documented independent PASS:** CORRECTION_INCOMPLETE / CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED. Draft PR must remain unmerged, no product deployment, no main/integration edits.
