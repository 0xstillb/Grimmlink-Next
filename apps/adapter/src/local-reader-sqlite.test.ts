import Fastify from "fastify";
import { type LocalStore, pairOfflineReader, revokeOfflineReader } from "@grimmlink/persistence";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { createLocalReaderRouteSource } from "./local-reader-sqlite.js";
import { registerLocalReaderRoutes } from "./local-reader-routes.js";

type TestSqlite = {
  exec: (sql: string) => void;
  close: () => void;
};
const persistenceRequire = createRequire(
  fileURLToPath(new URL("../../../packages/persistence/package.json", import.meta.url)),
);
const Database = persistenceRequire("better-sqlite3") as new (path: string) => TestSqlite;
const OWNER = { kind: "authenticated-local-owner" as const, accountId: "owner" };
const FILE = { bookId: "book-1", bookFileId: "file-1", editionSha256: "a".repeat(64) };

it("mounts paired reader requests against real local SQLite persistence and enforces revocation", async () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE single_owner (slot INTEGER PRIMARY KEY CHECK (slot = 1), owner_id TEXT NOT NULL);
    CREATE TABLE paired_reader_devices (
      device_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, token_sha256 TEXT NOT NULL,
      generation INTEGER NOT NULL DEFAULT 1, expires_at INTEGER NOT NULL,
      revoked_at INTEGER, created_at INTEGER NOT NULL
    );
    CREATE TABLE phase06_offline_progress (
      book_file_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, book_id TEXT NOT NULL,
      edition_sha256 TEXT NOT NULL
    );
  `);
  const migration = readFileSync(
    new URL("../../../packages/persistence/migrations/0006_phase07_personal.sql", import.meta.url),
    "utf8",
  ).replace(/^--> statement-breakpoint\s*$/gm, "");
  sqlite.exec(migration);
  const store = { sqlite, orm: undefined, close: () => sqlite.close() } as unknown as LocalStore;
  const ownerAuth = {
    authorizeOwner: async (request: { headers: Record<string, unknown> }) =>
      request.headers.cookie === "owner-session",
    verifyCsrf: async (request: { headers: Record<string, unknown> }) =>
      request.headers["x-csrf-token"] === "owner-csrf",
    registerRoutes: () => undefined,
  };
  let now = 10_000;
  const token = pairOfflineReader(sqlite as never, OWNER, "reader-1", now, now + 86_400_000).token;
  const source = createLocalReaderRouteSource(store, ownerAuth, () => now);
  const server = Fastify({ logger: false });
  registerLocalReaderRoutes(server, source);
  await server.ready();

  const prefix = "/api/grimmlink/v2/local/reader";
  const auth = { authorization: `Bearer ${token}`, "x-reader-device-id": "reader-1" };
  expect(
    (await server.inject({ method: "GET", url: `${prefix}/status`, headers: auth })).json(),
  ).toMatchObject({ mode: "STAGING_LOCAL_ONLY", officialForwarding: "DENY_ALL" });
  expect(
    (
      await server.inject({
        method: "POST",
        url: `${prefix}/files`,
        headers: { cookie: "owner-session", "x-csrf-token": "owner-csrf" },
        payload: FILE,
      })
    ).statusCode,
  ).toBe(201);
  const start = await server.inject({
    method: "POST",
    url: `${prefix}/sessions/session-1`,
    headers: auth,
    payload: {
      bookFileId: FILE.bookFileId,
      editionSha256: FILE.editionSha256,
      eventId: "event-start",
      expectedRevision: 0,
      action: "START",
    },
  });
  expect(start.statusCode).toBe(200);
  expect(start.json()).toEqual({ status: "LOCAL_RECORDED", revision: 1 });
  const stop = await server.inject({
    method: "POST",
    url: `${prefix}/sessions/session-1`,
    headers: auth,
    payload: {
      bookFileId: FILE.bookFileId,
      editionSha256: FILE.editionSha256,
      eventId: "event-stop",
      expectedRevision: 1,
      action: "STOP",
    },
  });
  expect(stop.json()).toEqual({ status: "LOCAL_RECORDED", revision: 2 });
  expect(
    (
      await server.inject({
        method: "POST",
        url: `${prefix}/sessions/session-2`,
        headers: auth,
        payload: {
          bookFileId: FILE.bookFileId,
          editionSha256: "b".repeat(64),
          eventId: "event-bad",
          expectedRevision: 0,
          action: "START",
        },
      })
    ).statusCode,
  ).toBe(409);

  now += 1_000;
  revokeOfflineReader(sqlite as never, OWNER, "reader-1", now);
  expect(
    (await server.inject({ method: "GET", url: `${prefix}/status`, headers: auth })).statusCode,
  ).toBe(401);
  await server.close();
  store.close();
});
