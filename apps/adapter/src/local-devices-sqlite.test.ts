import Fastify from "fastify";
import { verifyOfflineReader, type LocalStore } from "@grimmlink/persistence";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { createLocalDevicesRouteSource } from "./local-devices-sqlite.js";
import { registerLocalDevicesRoutes } from "./local-devices-routes.js";

type TestSqlite = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { get: (...args: string[]) => unknown };
  transaction: <T>(operation: () => T) => (() => T) & { immediate: () => T };
  close: () => void;
};
const persistenceRequire = createRequire(
  fileURLToPath(new URL("../../../packages/persistence/package.json", import.meta.url)),
);
const Database = persistenceRequire("better-sqlite3") as new (path: string) => TestSqlite;

it("binds owner-guarded HTTP routes to SQLite while storing only token hashes", async () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE single_owner (slot INTEGER PRIMARY KEY CHECK (slot = 1), owner_id TEXT NOT NULL);
    CREATE TABLE paired_reader_devices (
      device_id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      token_sha256 TEXT NOT NULL,
      generation INTEGER NOT NULL DEFAULT 1,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      created_at INTEGER NOT NULL
    );
  `);
  const store = { sqlite, orm: undefined, close: () => sqlite.close() } as unknown as LocalStore;
  let now = 1_000;
  let ownerAuthorized = false;
  let csrfValid = false;
  const ownerAuth = {
    authorizeOwner: async () => ownerAuthorized,
    verifyCsrf: async () => csrfValid,
    registerRoutes: () => undefined,
  };
  try {
    const source = createLocalDevicesRouteSource(store, ownerAuth, () => now);
    const server = Fastify({ logger: false });
    registerLocalDevicesRoutes(server, source);
    await server.ready();

    const path = "/api/grimmlink/v2/local/devices";
    expect((await server.inject({ method: "GET", url: path })).statusCode).toBe(403);
    ownerAuthorized = true;
    expect((await server.inject({ method: "GET", url: path })).json()).toMatchObject({
      source: "LOCAL_SQLITE_OFFLINE",
      devices: [],
      officialWrites: "OFF",
    });
    expect(
      (
        await server.inject({
          method: "POST",
          url: path,
          payload: { deviceId: "koreader-01", expiresInDays: 30 },
        })
      ).statusCode,
    ).toBe(403);
    csrfValid = true;
    const createResponse = await server.inject({
      method: "POST",
      url: path,
      payload: { deviceId: "koreader-01", expiresInDays: 30 },
    });
    expect(createResponse.statusCode).toBe(201);
    const paired = createResponse.json() as { token: string; generation: number };
    expect(source.listDevices()).toHaveLength(1);
    expect(paired.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(paired.generation).toBe(1);
    const list = await server.inject({ method: "GET", url: path });
    expect(list.json()).toMatchObject({ devices: [{ deviceId: "koreader-01", state: "ACTIVE" }] });
    expect(JSON.stringify(list.json())).not.toContain(paired.token);
    const row = store.sqlite
      .prepare("SELECT token_sha256 FROM paired_reader_devices WHERE device_id=?")
      .get("koreader-01") as { token_sha256: string };
    expect(row.token_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(row.token_sha256).not.toBe(paired.token);
    expect(verifyOfflineReader(store.sqlite, "owner", "koreader-01", paired.token, now + 1)).toBe(
      true,
    );

    now += 1_000;
    const rotateResponse = await server.inject({
      method: "POST",
      url: `${path}/koreader-01/rotate`,
      payload: { expiresInDays: 30 },
    });
    const rotated = rotateResponse.json() as { token: string; generation: number };
    expect(rotateResponse.statusCode).toBe(200);
    expect(rotated.generation).toBe(2);
    expect(verifyOfflineReader(store.sqlite, "owner", "koreader-01", paired.token, now + 1)).toBe(
      false,
    );
    expect(verifyOfflineReader(store.sqlite, "owner", "koreader-01", rotated.token, now + 1)).toBe(
      true,
    );
    now += 1_000;
    const revokeResponse = await server.inject({
      method: "POST",
      url: `${path}/koreader-01/revoke`,
      payload: {},
    });
    expect(revokeResponse.statusCode).toBe(204);
    expect(verifyOfflineReader(store.sqlite, "owner", "koreader-01", rotated.token, now)).toBe(
      false,
    );
    await server.close();
  } finally {
    store.close();
  }
});
