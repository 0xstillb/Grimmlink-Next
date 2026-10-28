# Phase 00 — Start Here

**Bootstrap status:** NOT STARTED. This document prepares the phase but does not execute the source audit, tests or contract freeze.

## Official instructions

- [PHASE 00 implementation/reviewer prompts](https://app.notion.com/p/407c7efbc00981e2b08ff8fb45c3f846)
- [Master Playbook](https://app.notion.com/p/407c7efbc009814a9e18f0d945ee0ef0)
- [Technical Spec](https://app.notion.com/p/407c7efbc00981f1a9c6ccb0de5d6a54)
- [Upgrade Runbook](https://app.notion.com/p/407c7efbc0098105b492d0a7cca31bff)

## First actions

1. Inspect source repos and latest stable releases as well as the **actually deployed** Grimmory version if access is provided. Do not assume upstream `develop` equals installed tag.
2. Verify Official Metadata, Cover, OPDS, KOSync, Personal Data APIs, auth and NETWORK disk behavior.
3. Fill [API-INVENTORY.md](../API-INVENTORY.md), [UPSTREAM-MANIFEST.json](../UPSTREAM-MANIFEST.json), and resolve or register blockers.
4. Freeze contracts, package layout, security/data ownership, single-port Gateway route map, intended deployment.
5. Write `phase-00/RESULT.md`, `HANDOFF.json`, `REVIEW.md` **only after actual work** with real source references, git SHA and command results.
6. Use an independent reviewer with the Reviewer Prompt. Phase exits only after a review-backed contract lock.

**Tests for Phase 00:** Static/source verification and JSON validation only. No real NAS, Hermes, readers, production mutation or full E2E. Phase 09 exclusively handles integrated E2E.
