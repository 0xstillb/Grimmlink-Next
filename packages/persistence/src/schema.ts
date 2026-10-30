import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Base operational tables only. Phase07 private notes live in separate offline SQL tables; no live upstream routes. */
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    status: text("status", { enum: ["PENDING", "LEASED", "DONE", "FAILED"] })
      .notNull()
      .default("PENDING"),
    idempotencyKey: text("idempotency_key").notNull(),
    leaseOwner: text("lease_owner"),
    leaseUntil: integer("lease_until"),
    attemptCount: integer("attempt_count").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("jobs_idempotency_unique").on(table.idempotencyKey),
    index("jobs_lease_lookup").on(table.status, table.leaseUntil),
  ],
);

/** Future Phase07 session transmissions are disabled; UNKNOWN must never auto-retry. */
export const outbox = sqliteTable(
  "outbox",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    state: text("state", { enum: ["PENDING", "RESERVED", "UNCERTAIN", "ACKED"] }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: integer("created_at").notNull(),
    reservedAt: integer("reserved_at"),
  },
  (table) => [uniqueIndex("outbox_idempotency_unique").on(table.idempotencyKey)],
);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  operation: text("operation").notNull(),
  result: text("result").notNull(),
  correlationId: text("correlation_id"),
  occurredAt: integer("occurred_at").notNull(),
});

export const runtimeSettings = sqliteTable("runtime_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
