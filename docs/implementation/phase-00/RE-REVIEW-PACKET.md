# Phase 00 — Fresh Independent Re-review Packet

**Prepared 2026-10-29 by the implementer, NOT by an independent reviewer.** Verdict of the prior [Independent REVIEW.md](REVIEW.md): **CHANGES_REQUIRED / NOT CONTRACT_LOCKED**. This packet is a handoff, not approval.

## Scope and live starting point

- Repository [0xstillb/Grimmlink-Next](https://github.com/0xstillb/Grimmlink-Next), open **Draft [PR #2](https://github.com/0xstillb/Grimmlink-Next/pull/2)**, `feat/next-phase-00` targeting `integration/grimmlink-next`. **Fetch live GitHub HEAD and PR status**; do not trust a SHA in this file as the current HEAD.
- Original independent review examined `5eccac25c8e85e16cfa913b72ae36bc6a3ceeed8`. Review/handoff checkpoint was `5efdaf3bef051d0d5c44f6274a2cd2bf22010de5`; main correction response `a775cfbbe24eb92382cd2b0f93dc31229845ef99` and consistency cleanup `c6dd89c170268c952ecc5e7d2cfd942b481c4ab8`. Inspect **all subsequent commits and the actual cumulative diff since `5efdaf3`**, not only one commit.
- Historical PR #1 merged to integration at `5470c7ad807cb701381ae8bcd9abe516f351b150` before an independent Phase00 approval. `main` has not been authorized for change.
- Read [REVIEW.md](REVIEW.md), [REMEDIATION.md](REMEDIATION.md), [CONTRACT.md](../CONTRACT.md), [API-INVENTORY.md](../API-INVENTORY.md), [DECISIONS.md](../DECISIONS.md), [DISCREPANCIES.md](../DISCREPANCIES.md), [FIXTURE-PLAN.md](FIXTURE-PLAN.md), [UPSTREAM-MANIFEST.json](../UPSTREAM-MANIFEST.json), [RESULT.md](RESULT.md), [HANDOFF.json](HANDOFF.json), [ACTIVE-SESSION.json](../ACTIVE-SESSION.json), [SESSION-HANDOFF.md](../SESSION-HANDOFF.md), [AGENTS.md](../../../AGENTS.md) and [Phase00 Notion](https://app.notion.com/p/407c7efbc00981e2b08ff8fb45c3f846).
- Source-only baselines: [Grimmory v3.5.0 commit 402e89b](https://github.com/grimmory-tools/grimmory/tree/402e89b4452f8e2b17ab95f16c1621c003516cd2) and [Readest v0.12.16 commit 3cc39ad](https://github.com/readest/readest/tree/3cc39ad7a558e6612e1a8135058fbd6f3c90b3e3). Neither represents proven installed versions.

## R-01 to R-12 — reviewer acceptance checklist

| Finding | Critical questions for independent reviewer | Safe unresolved default |
| --- | --- | --- |
| **R-01 P0** OPF | [BookReviewUpdateService:26-61](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookReviewUpdateService.java#L26-L61) ignores replaceMode. Is the default scalar-only field mask explicit? Are non-null empty reviews, authors, categories, moods/tags, locks, clearFlags and approved whole-set diff addressed? | metadataApply OFF |
| **R-02 P0** ACL | Does [BookAccessAspect:31-68](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/config/security/aspect/BookAccessAspect.java#L31-L68) apply ONLY where annotated? Does [Native KOSync global hash lookup](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java#L271-L293) lack shown library/content checks? Are foreign library and restricted-book cases across GET/PUT bookmarks/annotations/session/status/rating denied by design, without admin impersonation? This is a proof gap, **not** a demonstrated exploit. | unverified KOSync pass-through and personal bridge OFF |
| **R-03 P0** Native progress | Does Native KOSync *attempt* both writes, with possible stale/null CFI or swallowed file-level write error? [Source:150-183](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java#L150-L183). Is the managed second writer OFF? | managedProgressProjection OFF |
| **R-04 P0** Read status | Does Native 0–<0.25% reset manually selected READ, and do docs/fixtures avoid asserting status preservation or fabricating 0.25%? [Source:215-227](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/koreader/KoreaderService.java#L215-L227). | accepted limitation; no compensating write |
| **R-05 P0** NAS | Is [SidecarMetadataWriter global isLocalStorage guard](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/sidecar/SidecarMetadataWriter.java#L43-L77) stated accurately and [updater file/Sidecar/move settings](https://github.com/grimmory-tools/grimmory/blob/v3.5.0/backend/src/main/java/org/booklore/service/metadata/BookMetadataUpdater.java#L128-L174) separated from per-library NETWORK? | no export/move/source write; NAS RO |
| **R-06 P0** CFI | Does EXACT require same EPUB bytes/edition/spine DOM text offset and bidirectional anchor proof, not a converter string alone? [Prose source](https://github.com/mbret/prose-reader/blob/1e2a38f0e48936792b222f27f79fe7dd511c8336/packages/koreader/src/cfi.ts#L63-L90). | EXACT OFF; retain raw XPointer |
| R-07 P1 identity | Readest book.hash and Grimmory currentHash are not assumed equal. Is /api/koreader gateway prefix, per-user book identity and 6060 routing specified? | reject ambiguous hash |
| R-08 P1 Readest | Readest 401 may try /users/create; Official 403, accounts must be provisioned. OPDS is add-only, not full membership. | no fake auto-provision/shelf promise |
| R-09 P1 sessions | Session POST 202 may duplicate; durable eventID, dedupe, timeout and ACK policy designed. | no blind resend |
| R-10 P1 deployment | Source tags vs installed image digest, migration/NAS/reader state remain UNKNOWN. | Phase09 proof required |
| R-11 P1 handoff | PR1 historical merged, PR2 current Draft; every CURRENT banner preserves previous CHANGES_REQUIRED; historical banners are labeled. | no self approval |
| R-12 P1 cover | Separate cover MIME/locks/bytes/permission/readback, no live Sidecar export as read-only test. | coverApply OFF |

For each R-ID, report **DOC_FIXED / DOC_PARTIAL / DOC_UNFIXED** with actual correction-file `path:line` and upstream source link. Separately classify **design blocker**, **implementation gate**, and **Phase09 runtime verification**. An OFF-by-default flag written in docs is NOT proof that runtime code enforces it.

## Verdict rules and execution boundary

- **APPROVED / CONTRACT_LOCKED:** independent reviewer proves Phase00 source-contract statements internally coherent with no unresolved design-level P0, explicit fail-closed choices and downstream owners. This approves **design only**, not live auth/metadata writes.
- **CHANGES_REQUIRED:** inconsistencies, unsupported source claims, unsafe/default-on behavior, missing essential ACL or destructive OPF protection.
- **BLOCKED:** a critical safe design requires incompatible upstream protocol/auth or cannot be expressed under the agreed no-fork constraints. No made-up workaround.
- Full integrated E2E, live Hermes/NAS, real KOReader/Readest/X4 Pro and deployed acceptance must be **Phase09**. Phase00 source/JSON/Markdown checks only. Never claim compile/unit/mock/API PASS unless actually executed.
- Do not merge PR #2, change `main` or start Phase01 before actual independent gate. Own-PR REQUEST_CHANGES GitHub API can fail; if so document verdict transparently in PR Conversation; do not present it as a formal review.

## Copyable prompt — use in a **new conversation** for independent evaluation

```text
You are a fresh independent Phase00 reviewer for 0xstillb/Grimmlink-Next.
Use connected GitHub and Notion. Fetch LIVE Draft PR #2 HEAD and read
docs/implementation/phase-00/RE-REVIEW-PACKET.md, prior independent REVIEW,
implementer REMEDIATION and every linked contract, API Inventory, fixture,
discrepancy, manifest and handoff. Independently verify all R-01..R-12
against the corrected project path:line, pinned Grimmory v3.5.0 and
Readest v0.12.16 source. Do NOT trust self-attested fixes.
For each R-ID issue DOC_FIXED/DOC_PARTIAL/DOC_UNFIXED with source proof,
remaining blockers, and an overall APPROVED / CHANGES_REQUIRED / BLOCKED.
Only set CONTRACT_LOCKED if supported by a real independent Phase00
DESIGN review; never claim deployed runtime or E2E proof. Commit the
actual independent findings and honest handoff to the existing feature
branch and update Notion after verifying the GitHub SHA.
No merge, no main change, no Phase01 before gate. Full real E2E Phase09.
```

**This packet is NOT an independent re-review. Previous verdict CHANGES_REQUIRED remains until another reviewer actually completes the gate.**
