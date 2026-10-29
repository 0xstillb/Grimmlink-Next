# Next Fresh Independent Review Packet (Phase00)

Independent reviewer must use NEW context and verify the **actual** Draft PR #2 HEAD; do not treat this author as reviewer. Compare previous independent baseline `9eb7790367d2272e430ee78d2323952960234c00` to live `feat/next-phase-00`. Base = `integration/grimmlink-next`; PR must stay **OPEN/DRAFT/UNMERGED**. Do not edit source, merge or approve Phase01.

## Read first
1. `AGENTS.md`, `ACTIVE-SESSION.json`, `SESSION-HANDOFF.md`, `phase-00/HANDOFF.json`.
2. Prior `REVIEW.md`, `FINAL-INDEPENDENT-REVIEW-2026-10-29.md` and `SECURITY-REMEDIATION-2026-10-29.md` (historical, immutable).
3. `ROUTE-CENSUS-INDEX.md`, four root annexes, `ROUTE-CENSUS-APP.md`, `APP-CONTROLLER-ROUTES.json`, `ROUTE-MAPPING-EXPANSION.md`, `SECURITY-ROUTE-OWNERSHIP.md`.
4. `CONTRACT.md`, `API-INVENTORY.md`, `ADR-025-NATIVE-KOSYNC-SECURITY.md`, `DISCREPANCIES.md`, `FIXTURE-PLAN.md`, `SECURITY-NEGATIVE-FIXTURES.json`, `UPSTREAM-MANIFEST.json` and report.

## Independent checks
- Re-enumerate pinned Grimmory v3.5.0 full backend Java tree; search **all** classes for `@Controller/@RestController/@RequestMapping` and functional/generated routes, not just filenames. Validate 64 recognized controllers / 348 method annotations; don't confuse annotations with runtime expanded route count.
- Inspect AppBook/AppNotebook services and downstream delegate/row ACL; verify all 27 App annotation source lines and any security bypass, avoiding unsupported exploit claims.
- Expand Komga 9×5 declarations, catch-all, AdditionalFile conditional params; check class prefix, headers, produces, OPTIONS/HEAD and alias semantics; runtime handler exporter NOT_RUN unless actual execution.
- Assess whole-batch reset policies BOOKLORE/KOREADER/KOBO and rating reset; KOBO must remain user-scoped as source says, no atomically authorized claim for gateway precheck.
- Assess Native KOSync strict atomicity, route interception and credential redaction; leave OFF unless source demonstrates truly atomic Original authority.
- Assess OPF scalar types, file fingerprint, current locks, exact edition, side effects and zero-lost-update limitation; session outbox pre-send drop/lost-ACK UNCERTAIN and no retry.
- Parse all JSON and check that files/links/branch/PR/Notion agree; check no secrets or false PASS. Mock/build/runtime tests NOT_RUN except actual run proof.

## Verdict contract
Return per-finding `DOC_FIXED/DOC_PARTIAL/DOC_UNFIXED` **without** implying runtime PASS. Independently record unresolved blockers and exact correction paths:lines. Until explicit independent approval: `CHANGES_REQUIRED / NOT_CONTRACT_LOCKED / PHASE01_NOT_AUTHORIZED`. Never upgrade the status merely because documents were committed.
