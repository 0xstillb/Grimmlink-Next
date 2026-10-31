import Fastify from "fastify";
import { expect, it } from "vitest";
import {
  registerLocalDevicesRoutes,
  type LocalDevicesRouteSource,
} from "./local-devices-routes.js";

it("guards local device inventory and mutations, returns tokens once, and never lists token bytes", async () => {
  const server = Fastify({ logger: false });
  let owner = false;
  let csrf = false;
  let now = 1_000;
  let tokenSerial = 0;
  const devices = new Map<
    string,
    {
      deviceId: string;
      generation: number;
      expiresAtMs: number;
      revokedAtMs: number | null;
      token: string;
    }
  >();
  const source: LocalDevicesRouteSource = {
    authorizeOwner: async () => owner,
    verifyCsrf: async () => csrf,
    now: () => now,
    listDevices: () =>
      [...devices.values()].map(({ deviceId, generation, expiresAtMs, revokedAtMs }) => ({
        deviceId,
        generation,
        expiresAtMs,
        revokedAtMs,
      })),
    pairDevice: (deviceId, _nowMs, expiresAtMs) => {
      if (devices.has(deviceId)) throw new Error("DEVICE_EXISTS");
      const token = String.fromCharCode(65 + tokenSerial++).repeat(43);
      devices.set(deviceId, { deviceId, generation: 1, expiresAtMs, revokedAtMs: null, token });
      return { deviceId, generation: 1, token };
    },
    revokeDevice: (deviceId, nowMs) => {
      const device = devices.get(deviceId);
      if (!device || device.revokedAtMs !== null) throw new Error("NOT_ACTIVE");
      device.revokedAtMs = nowMs;
    },
    rotateDevice: (deviceId, _nowMs, expiresAtMs) => {
      const device = devices.get(deviceId);
      if (!device || device.revokedAtMs !== null || device.expiresAtMs <= now)
        throw new Error("NOT_ACTIVE");
      const token = String.fromCharCode(65 + tokenSerial++).repeat(43);
      device.token = token;
      device.generation += 1;
      device.expiresAtMs = expiresAtMs;
      return { deviceId, generation: device.generation, token };
    },
  };
  registerLocalDevicesRoutes(server, source);
  await server.ready();

  const path = "/api/grimmlink/v2/local/devices";
  expect((await server.inject({ method: "GET", url: path })).statusCode).toBe(403);
  owner = true;
  expect((await server.inject({ method: "GET", url: path })).json()).toEqual({
    source: "LOCAL_SQLITE_OFFLINE",
    devices: [],
    officialWrites: "OFF",
  });
  expect(
    (
      await server.inject({
        method: "POST",
        url: path,
        payload: { deviceId: "reader-1", expiresInDays: 30 },
      })
    ).json(),
  ).toEqual({ error: "CSRF_REQUIRED" });

  csrf = true;
  const created = await server.inject({
    method: "POST",
    url: path,
    payload: { deviceId: "reader-1", expiresInDays: 30 },
  });
  expect(created.statusCode).toBe(201);
  expect(created.headers["cache-control"]).toBe("no-store");
  const pair = created.json() as { token: string; generation: number; expiresAtMs: number };
  expect(pair.token).toMatch(/^[A-Z]{43}$/);
  expect(pair.generation).toBe(1);
  expect(pair.expiresAtMs).toBe(now + 30 * 24 * 60 * 60 * 1000);
  expect(JSON.stringify((await server.inject({ method: "GET", url: path })).json())).not.toContain(
    pair.token,
  );

  const rotated = await server.inject({
    method: "POST",
    url: `${path}/reader-1/rotate`,
    payload: { expiresInDays: 15 },
  });
  expect(rotated.statusCode).toBe(200);
  expect(rotated.json()).toMatchObject({ deviceId: "reader-1", generation: 2 });
  expect((rotated.json() as { token: string }).token).not.toBe(pair.token);

  now += 1_000;
  const revoked = await server.inject({
    method: "POST",
    url: `${path}/reader-1/revoke`,
    payload: {},
  });
  expect(revoked.statusCode).toBe(204);
  const listing = await server.inject({ method: "GET", url: path });
  expect(listing.json()).toMatchObject({
    devices: [{ deviceId: "reader-1", state: "REVOKED", revokedAtMs: now }],
  });
  await server.close();
});

it("rejects malformed device inputs, invalid TTLs and owner-guard errors", async () => {
  const server = Fastify({ logger: false });
  registerLocalDevicesRoutes(server, {
    authorizeOwner: async () => {
      throw new Error("AUTH_PROVIDER_FAILED");
    },
    verifyCsrf: async () => true,
    now: () => 1_000,
    listDevices: () => [],
    pairDevice: () => {
      throw new Error("SHOULD_NOT_RUN");
    },
    revokeDevice: () => {
      throw new Error("SHOULD_NOT_RUN");
    },
    rotateDevice: () => {
      throw new Error("SHOULD_NOT_RUN");
    },
  });
  await server.ready();
  const response = await server.inject({
    method: "POST",
    url: "/api/grimmlink/v2/local/devices",
    payload: { deviceId: "bad/id", expiresInDays: 91 },
  });
  expect(response.statusCode).toBe(403);
  expect(response.json()).toEqual({ error: "OWNER_AUTH_REQUIRED" });
  let authenticated = false;
  const invalidOwnerServer = Fastify({ logger: false });
  registerLocalDevicesRoutes(invalidOwnerServer, {
    authorizeOwner: async () => authenticated,
    verifyCsrf: async () => authenticated,
    now: () => 1_000,
    listDevices: () => [],
    pairDevice: () => {
      throw new Error("SHOULD_NOT_RUN");
    },
    revokeDevice: () => {
      throw new Error("SHOULD_NOT_RUN");
    },
    rotateDevice: () => {
      throw new Error("SHOULD_NOT_RUN");
    },
  });
  await invalidOwnerServer.ready();
  const deniedBeforeSchema = await invalidOwnerServer.inject({
    method: "POST",
    url: "/api/grimmlink/v2/local/devices",
    payload: { deviceId: "bad/id", expiresInDays: 91 },
  });
  expect(deniedBeforeSchema.statusCode).toBe(403);
  authenticated = true;
  const invalidInput = await invalidOwnerServer.inject({
    method: "POST",
    url: "/api/grimmlink/v2/local/devices",
    payload: { deviceId: "bad/id", expiresInDays: 91 },
  });
  expect(invalidInput.statusCode).toBe(400);
  await invalidOwnerServer.close();
  await server.close();
});
