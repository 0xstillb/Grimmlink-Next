import { scryptSync } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import type { LocalStore } from "@grimmlink/persistence";
import { createLocalDiagnosticsSettingsSource } from "./local-diagnostics-settings-sqlite.js";
import { createOwnerAuthenticator } from "./auth/owner-auth.js";
import { buildServer, getAdapterDiagnostics } from "./server.js";

type TestSqlite = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { get: (...args: unknown[]) => unknown };
  close: () => void;
};
const persistenceRequire = createRequire(
  fileURLToPath(new URL("../../../packages/persistence/package.json", import.meta.url)),
);
const Database = persistenceRequire("better-sqlite3") as new (path: string) => TestSqlite;

const PASSWORD = "server-diagnostics-owner-password";
const ORIGIN = "http://127.0.0.1:5173";
const SALT = Buffer.from("diag-owner-salt1");
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

it("persists and applies owner-configured diagnostics retention through the composed server", async () => {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE runtime_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE single_owner (slot INTEGER PRIMARY KEY CHECK (slot = 1), owner_id TEXT NOT NULL);
  `);
  const ownerAuth = createOwnerAuthenticator({
    passwordHash: PASSWORD_HASH,
    sessionSigningKey: Buffer.alloc(32, 0x51),
    publicOrigin: ORIGIN,
    now: () => 2_000,
  });
  const store = { sqlite, orm: undefined, close: () => sqlite.close() } as unknown as LocalStore;
  const server = await buildServer("error", {
    ownerAuth,
    localDiagnosticsSettings: createLocalDiagnosticsSettingsSource(store, () => 2_000),
  });

  try {
    const anonymous = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/settings/diagnostics",
    });
    expect(anonymous.statusCode).toBe(403);

    const login = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/auth/login",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      payload: { password: PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    const cookie = cookieHeader(login.headers["set-cookie"] as string | string[] | undefined);
    const csrfToken = (login.json() as { csrfToken: string }).csrfToken;

    const denied = await server.inject({
      method: "PUT",
      url: "/api/grimmlink/v2/local/settings/diagnostics",
      headers: { cookie, origin: ORIGIN, "content-type": "application/json" },
      payload: { maxEntries: 700, maxBytes: 2_097_152, retentionHours: 6 },
    });
    expect(denied.statusCode).toBe(403);

    const updated = await server.inject({
      method: "PUT",
      url: "/api/grimmlink/v2/local/settings/diagnostics",
      headers: {
        cookie,
        origin: ORIGIN,
        "x-csrf-token": csrfToken,
        "content-type": "application/json",
      },
      payload: { maxEntries: 700, maxBytes: 2_097_152, retentionHours: 6 },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      source: "OWNER_CONFIGURED_LOCAL_DIAGNOSTICS",
      maxEntries: 700,
      maxBytes: 2_097_152,
      retentionHours: 6,
      limits: { maxEntries: 10_000, maxBytes: 8_388_608, retentionHours: 24 },
    });
    expect(getAdapterDiagnostics(server)?.buffers.adapter.limits()).toEqual({
      maxEntries: 700,
      maxBytes: 2_097_152,
      retentionMs: 6 * 60 * 60 * 1_000,
    });
    const persisted = sqlite
      .prepare("SELECT value FROM runtime_settings WHERE key=?")
      .get("diagnostics.log-retention.v1") as { value: string };
    expect(JSON.parse(persisted.value)).toEqual({
      maxEntries: 700,
      maxBytes: 2_097_152,
      retentionHours: 6,
    });

    const invalid = await server.inject({
      method: "PUT",
      url: "/api/grimmlink/v2/local/settings/diagnostics",
      headers: {
        cookie,
        origin: ORIGIN,
        "x-csrf-token": csrfToken,
        "content-type": "application/json",
      },
      payload: { maxEntries: 700, maxBytes: 2_097_152, retentionHours: 25 },
    });
    expect(invalid.statusCode).toBe(400);
  } finally {
    await server.close();
    store.close();
  }
});
