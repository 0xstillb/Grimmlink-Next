import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";

const DEVICES_PATH = "/api/grimmlink/v2/local/devices";
const DEVICE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_TTL_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const DEVICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["deviceId", "generation", "expiresAtMs", "revokedAtMs", "state"],
  properties: {
    deviceId: { type: "string", pattern: "^[A-Za-z0-9_-]{1,128}$" },
    generation: { type: "integer", minimum: 1 },
    expiresAtMs: { type: "integer", minimum: 0 },
    revokedAtMs: { anyOf: [{ type: "integer", minimum: 0 }, { type: "null" }] },
    state: { type: "string", enum: ["ACTIVE", "EXPIRED", "REVOKED"] },
  },
} as const;
const TOKEN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["deviceId", "token", "generation", "expiresAtMs", "delivery"],
  properties: {
    deviceId: { type: "string", pattern: "^[A-Za-z0-9_-]{1,128}$" },
    token: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" },
    generation: { type: "integer", minimum: 1 },
    expiresAtMs: { type: "integer", minimum: 0 },
    delivery: { type: "string", const: "OFFLINE_TOKEN_SHOWN_ONCE" },
  },
} as const;

export type LocalDeviceRecord = Readonly<{
  deviceId: string;
  generation: number;
  expiresAtMs: number;
  revokedAtMs: number | null;
}>;

export type LocalDevicesRouteSource = Readonly<{
  authorizeOwner: OwnerAuthenticator["authorizeOwner"];
  verifyCsrf: OwnerAuthenticator["verifyCsrf"];
  now: () => number;
  listDevices: () => readonly LocalDeviceRecord[];
  pairDevice: (
    deviceId: string,
    nowMs: number,
    expiresAtMs: number,
  ) => Readonly<{ deviceId: string; token: string; generation: number }>;
  revokeDevice: (deviceId: string, nowMs: number) => void;
  rotateDevice: (
    deviceId: string,
    nowMs: number,
    expiresAtMs: number,
  ) => Readonly<{ deviceId: string; token: string; generation: number }>;
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function ttlExpiry(source: LocalDevicesRouteSource, days: unknown): number | null {
  if (typeof days !== "number" || !Number.isSafeInteger(days) || days < 1 || days > MAX_TTL_DAYS)
    return null;
  let nowMs: number;
  try {
    nowMs = source.now();
  } catch {
    return null;
  }
  const expiresAtMs = nowMs + days * DAY_MS;
  return Number.isSafeInteger(nowMs) && nowMs >= 0 && Number.isSafeInteger(expiresAtMs)
    ? expiresAtMs
    : null;
}

function noStore(reply: FastifyReply): void {
  reply
    .header("cache-control", "no-store")
    .header("pragma", "no-cache")
    .header("x-content-type-options", "nosniff");
}

/** Owner-authenticated local pairing inventory; token bytes are returned only on create/rotate. */
export function registerLocalDevicesRoutes(
  server: FastifyInstance,
  source: LocalDevicesRouteSource,
): void {
  const ownerOnly = async (request: FastifyRequest, reply: FastifyReply) => {
    let authorized = false;
    try {
      authorized = await source.authorizeOwner(request);
    } catch {
      authorized = false;
    }
    if (!authorized) return reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
  };
  const ownerAndCsrf = async (request: FastifyRequest, reply: FastifyReply) => {
    let authorized = false;
    try {
      authorized = await source.authorizeOwner(request);
    } catch {
      authorized = false;
    }
    if (!authorized) return reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
    let csrfValid = false;
    try {
      csrfValid = await source.verifyCsrf(request);
    } catch {
      csrfValid = false;
    }
    if (!csrfValid) return reply.code(403).send({ error: "CSRF_REQUIRED" });
  };

  server.get(
    DEVICES_PATH,
    {
      preValidation: ownerOnly,
      schema: {
        tags: ["Local Devices"],
        summary: "Read local paired-reader inventory",
        description:
          "Single-owner local SQLite inventory only. It does not establish a live reader connection or enable sync/Official writes.",
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["source", "devices", "officialWrites"],
            properties: {
              source: { type: "string", const: "LOCAL_SQLITE_OFFLINE" },
              devices: { type: "array", maxItems: 100, items: DEVICE_SCHEMA },
              officialWrites: { type: "string", const: "OFF" },
            },
          },
          403: ERROR_SCHEMA,
          503: ERROR_SCHEMA,
        },
      },
    },
    async (_request, reply) => {
      noStore(reply);
      try {
        const nowMs = source.now();
        if (!Number.isSafeInteger(nowMs) || nowMs < 0) throw new Error("INVALID_CLOCK");
        const devices = source.listDevices().map((device) => ({
          ...device,
          state:
            device.revokedAtMs !== null
              ? ("REVOKED" as const)
              : device.expiresAtMs <= nowMs
                ? ("EXPIRED" as const)
                : ("ACTIVE" as const),
        }));
        return reply.send({
          source: "LOCAL_SQLITE_OFFLINE",
          devices,
          officialWrites: "OFF",
        });
      } catch {
        return reply.code(503).send({ error: "LOCAL_DEVICE_INVENTORY_UNAVAILABLE" });
      }
    },
  );

  server.post<{ Body: unknown }>(
    DEVICES_PATH,
    {
      preValidation: ownerAndCsrf,
      bodyLimit: 2048,
      schema: {
        tags: ["Local Devices"],
        summary: "Create one local offline reader pairing token",
        description:
          "The token is returned once and stored only as a hash. This local preview does not pair a physical reader or enable sync.",
        body: {
          type: "object",
          additionalProperties: false,
          required: ["deviceId", "expiresInDays"],
          properties: {
            deviceId: { type: "string", pattern: "^[A-Za-z0-9_-]{1,128}$" },
            expiresInDays: { type: "integer", minimum: 1, maximum: MAX_TTL_DAYS },
          },
        },
        response: {
          201: TOKEN_SCHEMA,
          400: ERROR_SCHEMA,
          403: ERROR_SCHEMA,
          409: ERROR_SCHEMA,
          503: ERROR_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      noStore(reply);
      const body = request.body;
      if (
        !record(body) ||
        !exactKeys(body, ["deviceId", "expiresInDays"]) ||
        typeof body.deviceId !== "string" ||
        !DEVICE_ID.test(body.deviceId)
      ) {
        return reply.code(400).send({ error: "LOCAL_DEVICE_INPUT_INVALID" });
      }
      const expiresAtMs = ttlExpiry(source, body.expiresInDays);
      if (expiresAtMs === null) return reply.code(400).send({ error: "LOCAL_DEVICE_TTL_INVALID" });
      const nowMs = expiresAtMs - (body.expiresInDays as number) * DAY_MS;
      try {
        const paired = source.pairDevice(body.deviceId, nowMs, expiresAtMs);
        return reply.code(201).send({
          ...paired,
          expiresAtMs,
          delivery: "OFFLINE_TOKEN_SHOWN_ONCE",
        });
      } catch {
        return reply.code(409).send({ error: "LOCAL_DEVICE_ALREADY_EXISTS_OR_UNAVAILABLE" });
      }
    },
  );

  server.post<{ Params: { deviceId: string }; Body: unknown }>(
    `${DEVICES_PATH}/:deviceId/rotate`,
    {
      preValidation: ownerAndCsrf,
      bodyLimit: 1024,
      schema: {
        tags: ["Local Devices"],
        summary: "Rotate one local offline reader token",
        description:
          "Returns the replacement token once; the previous token stops validating immediately.",
        params: {
          type: "object",
          additionalProperties: false,
          required: ["deviceId"],
          properties: { deviceId: { type: "string", pattern: "^[A-Za-z0-9_-]{1,128}$" } },
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["expiresInDays"],
          properties: { expiresInDays: { type: "integer", minimum: 1, maximum: MAX_TTL_DAYS } },
        },
        response: {
          200: TOKEN_SCHEMA,
          400: ERROR_SCHEMA,
          403: ERROR_SCHEMA,
          409: ERROR_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      noStore(reply);
      const body = request.body;
      if (!record(body) || !exactKeys(body, ["expiresInDays"]))
        return reply.code(400).send({ error: "LOCAL_DEVICE_INPUT_INVALID" });
      const expiresAtMs = ttlExpiry(source, body.expiresInDays);
      if (expiresAtMs === null) return reply.code(400).send({ error: "LOCAL_DEVICE_TTL_INVALID" });
      const nowMs = expiresAtMs - (body.expiresInDays as number) * DAY_MS;
      try {
        const rotated = source.rotateDevice(request.params.deviceId, nowMs, expiresAtMs);
        return reply.send({ ...rotated, expiresAtMs, delivery: "OFFLINE_TOKEN_SHOWN_ONCE" });
      } catch {
        return reply.code(409).send({ error: "LOCAL_DEVICE_NOT_ACTIVE_OR_UNAVAILABLE" });
      }
    },
  );

  server.post<{ Params: { deviceId: string }; Body: unknown }>(
    `${DEVICES_PATH}/:deviceId/revoke`,
    {
      preValidation: ownerAndCsrf,
      bodyLimit: 1024,
      schema: {
        tags: ["Local Devices"],
        summary: "Revoke one local reader pairing",
        description:
          "Revocation affects local mock credentials only and does not contact the reader.",
        params: {
          type: "object",
          additionalProperties: false,
          required: ["deviceId"],
          properties: { deviceId: { type: "string", pattern: "^[A-Za-z0-9_-]{1,128}$" } },
        },
        body: { type: "object", additionalProperties: false, maxProperties: 0 },
        response: {
          204: { type: "null" },
          400: ERROR_SCHEMA,
          403: ERROR_SCHEMA,
          409: ERROR_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      noStore(reply);
      if (!record(request.body) || Object.keys(request.body).length !== 0)
        return reply.code(400).send({ error: "LOCAL_DEVICE_INPUT_INVALID" });
      let nowMs: number;
      try {
        nowMs = source.now();
      } catch {
        return reply.code(503).send({ error: "LOCAL_DEVICE_CLOCK_UNAVAILABLE" });
      }
      if (!Number.isSafeInteger(nowMs) || nowMs < 0)
        return reply.code(503).send({ error: "LOCAL_DEVICE_CLOCK_UNAVAILABLE" });
      try {
        source.revokeDevice(request.params.deviceId, nowMs);
        return reply.code(204).send();
      } catch {
        return reply.code(409).send({ error: "LOCAL_DEVICE_NOT_ACTIVE_OR_UNAVAILABLE" });
      }
    },
  );
}
