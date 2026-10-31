import Fastify from "fastify";
import type { LocalStore } from "@grimmlink/persistence";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { createLocalIdentityRouteSource } from "./local-identity-sqlite.js";
import { registerLocalIdentityRoutes } from "./local-identity-routes.js";

type TestSqlite = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { run: (...args: (string | number | null)[]) => unknown };
  close: () => void;
};
const persistenceRequire = createRequire(
  fileURLToPath(new URL("../../../packages/persistence/package.json", import.meta.url)),
);
const Database = persistenceRequire("better-sqlite3") as new (path: string) => TestSqlite;

it("returns only owner-scoped local identity registrations and never claims entitlement", async () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE single_owner (slot INTEGER PRIMARY KEY CHECK(slot=1), owner_id TEXT NOT NULL);
    CREATE TABLE phase05_writer_state (
      document_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      book_file_id TEXT NOT NULL,
      edition_sha256 TEXT NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('DISABLED','MOCK_MANAGED')),
      revision INTEGER NOT NULL DEFAULT 0,
      native_position TEXT,
      last_event_id TEXT
    );
  `);
  const store = { sqlite, orm: undefined, close: () => sqlite.close() } as unknown as LocalStore;
  let ownerAuthorized = false;
  try {
    const insert = sqlite.prepare(
      "INSERT INTO phase05_writer_state(document_id,owner_id,book_file_id,edition_sha256,mode,revision) VALUES (?,?,?,?,?,?)",
    );
    insert.run(
      "0123456789abcdef0123456789abcdef",
      "owner",
      "file-1",
      "a".repeat(64),
      "DISABLED",
      0,
    );
    insert.run(
      "fedcba9876543210fedcba9876543210",
      "other-owner",
      "private-file",
      "b".repeat(64),
      "DISABLED",
      1,
    );
    const source = createLocalIdentityRouteSource(store, {
      authorizeOwner: async () => ownerAuthorized,
      verifyCsrf: async () => false,
      registerRoutes: () => undefined,
    });
    const server = Fastify({ logger: false });
    registerLocalIdentityRoutes(server, source);
    await server.ready();
    const path = "/api/grimmlink/v2/local/identity";
    expect((await server.inject({ method: "GET", url: path })).statusCode).toBe(403);
    ownerAuthorized = true;
    const response = await server.inject({ method: "GET", url: path });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = response.json();
    expect(body).toMatchObject({
      source: "LOCAL_SQLITE_PHASE05_OFFLINE",
      officialOwnership: "NOT_VERIFIED",
      officialWrites: "OFF",
      items: [
        {
          koDocumentMd5: "0123456789abcdef0123456789abcdef",
          bookFileId: "file-1",
          editionSha256: "a".repeat(64),
          localWriterMode: "DISABLED",
          revision: 0,
          identityEvidence: "LOCAL_REGISTRATION_ONLY",
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("private-file");
    expect(JSON.stringify(body)).not.toContain("other-owner");
    await server.close();
  } finally {
    store.close();
  }
});
