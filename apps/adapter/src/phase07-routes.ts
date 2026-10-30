import type { FastifyInstance, FastifyRequest } from "fastify";

/**
 * Phase07 ISOLATED MOCK ONLY. This factory is never imported by server.ts.
 * Injected callbacks must resolve the paired principal and exact row identity
 * server-side. No client-supplied owner, token or Official credentials accepted.
 */
export interface IsolatedPhase07Source {
  authorizeOwner: (request: FastifyRequest) => Promise<boolean>;
  verifyMockCsrf: (request: FastifyRequest) => Promise<boolean>;
  authorizeReader: (request: FastifyRequest) => Promise<boolean>;
  getMockPersonal: (
    fileId: string,
    kind: string,
    recordId: string,
  ) => Promise<{ revision: number; deleted: boolean; value: unknown } | null>;
  putMockPersonal: (
    fileId: string,
    kind: string,
    recordId: string,
    event: Readonly<{
      eventId: string;
      expectedRevision: number;
      action: "UPSERT" | "DELETE";
      value: unknown;
    }>,
  ) => Promise<{ status: "LOCAL_RECORDED" | "CONFLICT"; revision: number }>;
  putMockSession: (
    sessionId: string,
    event: Readonly<{
      eventId: string;
      expectedRevision: number;
      action: "START" | "STOP";
    }>,
  ) => Promise<{ status: "LOCAL_RECORDED" | "CONFLICT"; revision: number }>;
  previewMockShelf: (
    known: readonly string[],
    selected: readonly string[],
  ) => Promise<{ mode: "MANUAL_PREVIEW_ONLY"; add: string[]; remove: string[] }>;
}

const id = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const rev = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const kind = (v: string): boolean => ["RATING", "BOOKMARK", "ANNOTATION"].includes(v);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>): string => Object.keys(v).sort().join(",");

export function registerIsolatedPhase07Routes(
  server: FastifyInstance,
  source: IsolatedPhase07Source,
): void {
  const readerGuard = async (
    request: FastifyRequest,
    reply: { code: (n: number) => { send: (body: object) => void } },
  ) => {
    if (!(await source.authorizeReader(request)))
      return reply.code(403).send({ error: "PAIRED_READER_REQUIRED" });
  };
  const ownerGuard = async (
    request: FastifyRequest,
    reply: { code: (n: number) => { send: (body: object) => void } },
  ) => {
    if (!(await source.authorizeOwner(request)))
      return reply.code(403).send({ error: "OWNER_REQUIRED" });
    if (!(await source.verifyMockCsrf(request)))
      return reply.code(403).send({ error: "CSRF_REQUIRED" });
  };
  server.get<{ Params: { file: string; kind: string; record: string } }>(
    "/api/grimmlink/v2/local/mock-personal/:file/:kind/:record",
    { preHandler: readerGuard },
    async (request, reply) => {
      const { file, kind: type, record } = request.params;
      if (!id(file) || !id(record) || !kind(type))
        return reply.code(400).send({ error: "MOCK_PERSONAL_ID_INVALID" });
      const result = await source.getMockPersonal(file, type, record);
      reply.header("cache-control", "no-store");
      return reply.send(result ?? { status: "NOT_FOUND" });
    },
  );
  server.put<{
    Params: { file: string; kind: string; record: string };
    Body: Record<string, unknown>;
  }>(
    "/api/grimmlink/v2/local/mock-personal/:file/:kind/:record",
    { preHandler: readerGuard },
    async (request, reply) => {
      const { file, kind: type, record } = request.params;
      const b = request.body;
      if (
        !id(file) ||
        !id(record) ||
        !kind(type) ||
        !isRecord(b) ||
        keys(b) !== "action,eventId,expectedRevision,value" ||
        !id(b.eventId) ||
        !rev(b.expectedRevision) ||
        (b.action !== "UPSERT" && b.action !== "DELETE") ||
        (b.action === "DELETE" && b.value !== null) ||
        (type === "RATING" && (record !== "rating" || b.action === "DELETE"))
      )
        return reply.code(400).send({ error: "MOCK_PERSONAL_EVENT_INVALID" });
      try {
        const result = await source.putMockPersonal(file, type, record, {
          eventId: b.eventId,
          expectedRevision: b.expectedRevision,
          action: b.action,
          value: b.value,
        });
        reply.header("cache-control", "no-store");
        return reply.code(result.status === "CONFLICT" ? 409 : 200).send(result);
      } catch {
        return reply.code(409).send({ error: "MOCK_PERSONAL_REJECTED" });
      }
    },
  );
  server.post<{ Params: { session: string }; Body: Record<string, unknown> }>(
    "/api/grimmlink/v2/local/mock-session/:session",
    { preHandler: readerGuard },
    async (request, reply) => {
      const b = request.body;
      if (
        !id(request.params.session) ||
        !isRecord(b) ||
        keys(b) !== "action,eventId,expectedRevision" ||
        !id(b.eventId) ||
        !rev(b.expectedRevision) ||
        (b.action !== "START" && b.action !== "STOP")
      )
        return reply.code(400).send({ error: "MOCK_SESSION_EVENT_INVALID" });
      try {
        const result = await source.putMockSession(request.params.session, {
          eventId: b.eventId,
          expectedRevision: b.expectedRevision,
          action: b.action,
        });
        reply.header("cache-control", "no-store");
        return reply.code(result.status === "CONFLICT" ? 409 : 200).send(result);
      } catch {
        return reply.code(409).send({ error: "MOCK_SESSION_REJECTED" });
      }
    },
  );
  server.post<{ Body: Record<string, unknown> }>(
    "/api/grimmlink/v2/local/mock-shelf-preview",
    { preHandler: ownerGuard },
    async (request, reply) => {
      const b = request.body;
      const arrayIds = (v: unknown): v is string[] =>
        Array.isArray(v) &&
        v.length <= 1000 &&
        v.every(id) &&
        new Set(v).size === v.length;
      if (
        !isRecord(b) ||
        keys(b) !== "known,selected,trigger" ||
        b.trigger !== "MANUAL_OWNER_ACTION" ||
        !arrayIds(b.known) ||
        !arrayIds(b.selected)
      )
        return reply.code(400).send({ error: "MOCK_MANUAL_SHELF_REQUIRED" });
      try {
        const result = await source.previewMockShelf(b.known, b.selected);
        reply.header("cache-control", "no-store");
        return reply.send(result);
      } catch {
        return reply.code(409).send({ error: "MOCK_SHELF_REJECTED" });
      }
    },
  );
}
