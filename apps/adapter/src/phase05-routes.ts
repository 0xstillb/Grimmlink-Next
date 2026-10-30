import type { FastifyInstance, FastifyRequest } from "fastify";

/**
 * Phase05 MOCK ROUTE FACTORY, never imported by the live server.
 * The callbacks require externally verified owner/CSRF or reader device auth;
 * untrusted request body/header account IDs are never accepted as principals.
 */
export interface IsolatedPhase05Source {
  authorizeOwner: (request: FastifyRequest) => Promise<boolean>;
  verifyMockCsrf: (request: FastifyRequest) => Promise<boolean>;
  pairMockDevice: (deviceId: string) => Promise<{ deviceId: string; token: string }>;
  revokeMockDevice: (deviceId: string) => Promise<void>;
  authorizeReader: (request: FastifyRequest) => Promise<boolean>;
  getMockPosition: (hash: string) => Promise<{ position: string | null; revision: number }>;
  recordMockPosition: (
    hash: string,
    request: Readonly<{ eventId: string; position: string; expectedRevision: number }>,
  ) => Promise<{ state: "LOCAL_RECORDED" | "CONFLICT"; revision: number }>;
}

const validId = (value: string): boolean => /^[A-Za-z0-9_-]{1,128}$/.test(value);
const validHash = (value: string): boolean => /^[0-9a-f]{32}$/.test(value);
export function registerIsolatedPhase05Routes(
  server: FastifyInstance,
  source: IsolatedPhase05Source,
): void {
  const ownerGuard = async (
    request: FastifyRequest,
    reply: {
      code: (n: number) => {
        send: (body: object) => void;
      };
    },
  ) => {
    if (!(await source.authorizeOwner(request))) {
      return reply.code(403).send({ error: "OWNER_REQUIRED" });
    }
    if (!(await source.verifyMockCsrf(request))) {
      return reply.code(403).send({ error: "CSRF_REQUIRED" });
    }
  };
  const readerGuard = async (
    request: FastifyRequest,
    reply: {
      code: (n: number) => {
        send: (body: object) => void;
      };
    },
  ) => {
    if (!(await source.authorizeReader(request))) {
      return reply.code(403).send({ error: "PAIRED_READER_REQUIRED" });
    }
  };
  server.post<{ Body: { deviceId?: string } }>(
    "/api/grimmlink/v2/local/mock-pair",
    { preHandler: ownerGuard },
    async (request, reply) => {
      if (
        !request.body ||
        typeof request.body !== "object" ||
        Array.isArray(request.body) ||
        Object.keys(request.body).join(",") !== "deviceId" ||
        typeof request.body.deviceId !== "string" ||
        !validId(request.body.deviceId)
      )
        return reply.code(400).send({ error: "INVALID_DEVICE" });
      const paired = await source.pairMockDevice(request.body.deviceId);
      reply.header("cache-control", "no-store");
      return reply.code(201).send(paired);
    },
  );
  server.post<{ Body: { deviceId?: string } }>(
    "/api/grimmlink/v2/local/mock-revoke",
    { preHandler: ownerGuard },
    async (request, reply) => {
      if (
        !request.body ||
        typeof request.body !== "object" ||
        Array.isArray(request.body) ||
        Object.keys(request.body).join(",") !== "deviceId" ||
        typeof request.body.deviceId !== "string" ||
        !validId(request.body.deviceId)
      )
        return reply.code(400).send({ error: "INVALID_DEVICE" });
      await source.revokeMockDevice(request.body.deviceId);
      reply.header("cache-control", "no-store");
      return reply.code(204).send();
    },
  );
  server.get<{ Params: { hash: string } }>(
    "/api/grimmlink/v2/local/mock-kosync/:hash",
    { preHandler: readerGuard },
    async (request, reply) => {
      if (!validHash(request.params.hash)) return reply.code(400).send({ error: "INVALID_HASH" });
      const value = await source.getMockPosition(request.params.hash);
      reply.header("cache-control", "no-store");
      return reply.send(value);
    },
  );
  server.put<{
    Params: { hash: string };
    Body: { eventId?: string; position?: string; expectedRevision?: number };
  }>(
    "/api/grimmlink/v2/local/mock-kosync/:hash",
    { preHandler: readerGuard },
    async (request, reply) => {
      const body = request.body;
      if (
        !validHash(request.params.hash) ||
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).sort().join(",") !== "eventId,expectedRevision,position" ||
        typeof body.eventId !== "string" ||
        !validId(body.eventId) ||
        typeof body.position !== "string" ||
        body.position.length < 1 ||
        body.position.length > 4096 ||
        body.position.includes("\0") ||
        typeof body.expectedRevision !== "number" ||
        !Number.isSafeInteger(body.expectedRevision) ||
        body.expectedRevision < 0
      )
        return reply.code(400).send({ error: "INVALID_EVENT" });
      const result = await source.recordMockPosition(request.params.hash, {
        eventId: body.eventId,
        position: body.position,
        expectedRevision: body.expectedRevision,
      });
      reply.header("cache-control", "no-store");
      return reply.code(result.state === "CONFLICT" ? 409 : 200).send(result);
    },
  );
}
