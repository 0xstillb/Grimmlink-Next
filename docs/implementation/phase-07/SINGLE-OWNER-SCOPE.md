# Phase 07 — KOReader Lua + Personal Data (Single-Owner Private, 2026-10-30)

**Development implementation:** [RESULT](RESULT.md) and [HANDOFF](HANDOFF.json). This is an **OFFLINE/LUA MOCK + SQLite contract only**, not a real KOReader-installed plugin, connected Grimmory Official API or synchronized personal database.

One canonical owner with multiple individually revocable paired devices. Synthetic owner fixture, exact bookId/bookFileId/edition SHA, per-record CAS, event-id idempotency, tombstones and local server-clock reading sessions. Ratings/bookmarks/annotations may be stored only in private local SQLite. Manual-only shelf preview calculates a diff but **never mutates any shelf membership**.

**Review policy:** no separate independent security review in Phase07; one consolidated review/remediation and full Hermes/NAS/real-reader E2E at Phase09. CI and honest handoff are required now.

**Safety:** personal/session bridge OFF, Native KOSync OFF, Official forwarding DENY_ALL, no live routes, no deployment. Real owner auth, Official atomic record entitlement, plugin integration, personal privacy/backups, unknown outbox reconciliation and hardware golden fixtures remain final operational gates.
