# Single-Owner Private Mode — Delivery Policy (effective 2026-10-30)

This prospective policy supersedes old *per-phase independent-review process requirements* in the historical playbook, phase plans and reviewer requests. It does not rewrite old evidence, approval records, or test results.

## Scope

- **One human owner / one canonical Grimmory Official account.** Multiple readers belong to that owner (KOReader, Readest, CrossPoint/X4 Pro, Web). GrimmLink does not implement organization roles, invited users, per-user book/library/row ACL, or an admin impersonation capability.
- **Single owner does not mean anonymous access.** Keep Official's native login and authorization, use secure per-device pairing tokens with revocation, protect admin writes with a real server-side session and browser CSRF protection, and enforce same-owner identity and safe book/file/record relationships.
- **Private deployment:** one published host port 6060, loopback/LAN only by default, no public WAN by default; credentials never logged. Maintain proxy route normalization, explicit upstream auth, no unrestricted fallback, safe backups and fail-closed writes.
- Preserve upstream Grimmory/Readest code, source NAS data and direct Grimmory DB from modification. Historical multi-user tests are optional compatibility regressions, not required feature-development work for the owner-only profile.

## Phase gates changed by owner decision

1. **Phases 00–08:** No *new mandatory independent/fresh-context security review*, reviewer signoff, or review-approval gate. Finish a development phase with actual GitHub SHA, relevant unit/build/type/mock integration tests, RESULT/HANDOFF, and a checkpoint of deferred risks. Optional developer self-review is welcome. A later safe phase may proceed even when risks remain deferred, provided unsafe operational features are disabled.
2. **Phase 09:** Perform **one consolidated independent security review**, remediate findings in one coordinated pass, run the real Hermes/NAS/readers end-to-end, test backups/rollback/ingress/auth, and obtain explicit owner release approval. Nothing is considered production-verified before this.
3. Interim functional safety is **not disabled**: do not enable a live Official proxy, secret-bearing endpoint, unauthenticated admin write, destructive metadata mutation or production network exposure without its actual runtime safety controls. Defer its activation, not the safety requirement.
4. CI safety and negative-test checks remain active. Preserve prior fixed review-attestation blobs and old status fields as history; do not mutate them into PASS. `DENY_ALL` and capability `OFF` remain until each implementation is separately safe to enable.
5. Integration branch merges still need owner approval/delegation; merge to main or production is only after Phase09 and explicit approval.

Use `DEV_CHECKS_PASS_WITH_DEFERRED_RISKS` for development delivery; `BLOCKED_OPERATIONAL_ENABLEMENT` for a real connection lacking security proof. These are separate states. See [Phase Matrix](PHASE-MATRIX.md), [Deferred Security Ledger](DEFERRED-SECURITY-LEDGER.md). Historical signed documents are audit history, not fresh acceptance gates.
