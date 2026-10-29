# Phase 00 NEW-P0-01 — Source-wide Census Execution Checkpoint

## Evidence scope and state

- Grimmory upstream: grimmory-tools/grimmory @ 402e89b4452f8e2b17ab95f16c1621c003516cd2 (immutable audit pin).
- Independent review: 9682f9ce9305ea5242af82418bec7e504bf1ca03; report commit: 1370f9f38482af1442a3ecd7570e7dbbc4ac3bdd.
- Correction starting HEAD verified live: d54df897a652185175a61c7063eb24b0adc89fac.
- Pinned Git tree verified: truncated=false, 923 Java paths in backend/src/main/java/org/booklore/.
- **923 paths in the tree are not proof of scanning 923 bodies.** Scanner and CI workflow only attempt to produce missing evidence; this is NOT a passing receipt.
- Existing annex: 64 named controller files and 348 method-level annotation occurrences (NOT expanded HTTP routes).
- Fixtures baseline: 97 synthetic definitions / 97 unique IDs; actual negative security test execution NOT_RUN. Validator performs static checks only.

## Source-only toolchain and output

1. scripts/phase-00/JavaRouteAstScanner.java parses Java syntax via JDK Compiler Tree API without executing or compiling upstream application classes.
2. scripts/phase-00/scan-java-routes.py verifies exact Git SHA, reads every Java body, checks each Git blob hash, AST parses, and records every file including no-signal files.
3. scripts/phase-00/validate-negative-fixtures.py checks static fixture invariants, not gateway or HTTP behavior.
4. .github/workflows/phase00-pinned-java-census.yml attempts pinned-source scanning on a feature branch push if Actions is enabled and permitted. It commits raw evidence only when remote HEAD matches the workflow starting SHA.

Expected artifacts after an actually successful CI run: JAVA-SOURCE-WIDE-CENSUS.json,
JAVA-SOURCE-WIDE-CENSUS-RECEIPT.md, SOURCE-ROUTE-CANDIDATES.json,
SOURCE-ROUTE-OWNERSHIP-GAPS.md, FIXTURE-STATIC-VALIDATION.json
(all under docs/implementation/phase-00/).

## Unclosed gates

1. Any failed source body/AST parse leaves NEW-P0-01 BLOCKED. No tree-only passes.
2. Full AST parsing alone does not prove meta-annotations, inheritance, composed path/conditions, runtime HTTP routes or gateway ownership. SOURCE_ANNOTATION_COMPLETE=false pending semantic reconciliation.
3. Spring runtime route exporter is NOT_RUN (Phase 02). No deployed route count is asserted.
4. KO registration deny/redaction, App ACL, native KO atomic book entitlement, metadata CAS and SQLite session crash tests remain design/OFF/BLOCKED without isolated implementation proof.
5. No independent reviewer approval. Controlling state remains CORRECTION_INCOMPLETE / CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED.
6. Do not modify independent reviewer reports, main/integration/upstream, merge PR 2 or begin Phase 01.

## Exact next action

Check CI run and committed report receipts; reconcile every source candidate with controller annexes, mapping expansion and route ownership, and only then request separate Independent Review. After verified Git commits, sync Notion Technical Spec, Playbook, Phase 00 and Handoff to the actual SHA. Failed CI means explicit P0 BLOCKED, not success.
