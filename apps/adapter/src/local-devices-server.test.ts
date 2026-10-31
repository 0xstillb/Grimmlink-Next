import { scryptSync } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import type { LocalStore } from "@grimmlink/persistence";
import { createLocalDevicesRouteSource } from "./local-devices-sqlite.js";
import { createOwnerAuthenticator } from "./auth/owner-auth.js";
import { buildServer } from "./server.js";

type TestSqlite = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { get: (...args: unknown[]) => unknown };
  close: () => void;
};
const persistenceRequire = createRequire(
  fileURLToPath(new URL("../../../packages/persistence/package.json", import.meta.url)),
);
const Database = persistenceRequire("better-sqlite3") as new (path: string) => TestSqlite;

const PASSWORD = "server-device-owner-password";
const ORIGIN = "http://127.0.0.1:5173";
const SALT = Buffer.from("owner-device-001");
const PASSWORD_HASH = `scrypt$32768$8$1$${SALT.toString("base64url")}$${scryptSync(
  PASSWORD,
  SALT,
  32,
  { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
).toString("base64url")}`;

function cookieHeader(setCookie: string | string[] | undefined): string {
  return (Array.isArray(setCookie) ? setCookie : [setCookie])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.split(";", 1)[0]!)
    .join("; ");
}

it("provisions, rotates and revokes a paired reader through the composed server", async () => {
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
  const ownerAuth = createOwnerAuthenticator({
    passwordHash: PASSWORD_HASH,
    sessionSigningKey: Buffer.alloc(32, 0x72),
    publicOrigin: ORIGIN,
    now: () => 1_000,
  });
  const store = { sqlite, orm: undefined, close: () => sqlite.close() } as unknown as LocalStore;
  const server = await buildServer("error", {
    ownerAuth,
    localDevices: createLocalDevicesRouteSource(store, ownerAuth, () => 1_000),
  });

  try {
    const anonymousPair = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/devices",
      payload: { deviceId: "koreader-main", expiresInDays: 30 },
    });
    expect(anonymousPair.statusCode).toBe(403);

    const login = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/auth/login",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      payload: { password: PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    const cookie = cookieHeader(login.headers["set-cookie"] as string | string[] | undefined);
    const csrfToken = (login.json() as { csrfToken: string }).csrfToken;
    const ownerHeaders = {
      cookie,
      origin: ORIGIN,
      "x-csrf-token": csrfToken,
      "content-type": "application/json",
    };

    const missingCsrf = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/devices",
      headers: { cookie, origin: ORIGIN, "content-type": "application/json" },
      payload: { deviceId: "koreader-main", expiresInDays: 30 },
    });
    expect(missingCsrf.statusCode).toBe(403);

    const pair = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/devices",
      headers: ownerHeaders,
      payload: { deviceId: "koreader-main", expiresInDays: 30 },
    });
    expect(pair.statusCode).toBe(201);
    const first = pair.json() as { token: string; generation: number };
    expect(first).toMatchObject({ generation: 1 });
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const list = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/devices",
      headers: { cookie },
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({
      devices: [{ deviceId: "koreader-main", generation: 1, state: "ACTIVE" }],
    });
    expect(list.body).not.toContain(first.token);

    const rotate = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/devices/koreader-main/rotate",
      headers: ownerHeaders,
      payload: { expiresInDays: 30 },
    });
    expect(rotate.statusCode).toBe(200);
    const second = rotate.json() as { token: string; generation: number };
    expect(second.generation).toBe(2);
    expect(second.token).not.toBe(first.token);

    const revoke = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/devices/koreader-main/revoke",
      headers: ownerHeaders,
      payload: {},
    });
    expect(revoke.statusCode).toBe(204);
    expect(
      (
        await server.inject({
          method: "GET",
          url: "/api/grimmlink/v2/local/devices",
          headers: { cookie },
        })
      ).json(),
    ).toMatchObject({
      devices: [{ deviceId: "koreader-main", state: "REVOKED" }],
    });
    const stored = sqlite
      .prepare("SELECT token_sha256,revoked_at FROM paired_reader_devices WHERE device_id=?")
      .get("koreader-main") as { token_sha256: string; revoked_at: number | null };
    expect(stored.token_sha256).not.toBe(second.token);
    expect(stored.revoked_at).toBe(1_000);
  } finally {
    await server.close();
    store.close();
  }
});
