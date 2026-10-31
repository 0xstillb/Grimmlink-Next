import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";

const PREFIX = "/api/grimmlink/v2/local/reader";
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const KINDS = new Set(["RATING", "BOOKMARK", "ANNOTATION"]);

export type ReaderPrincipal = Readonly<{ ownerId: string; deviceId: string; token: string }>;
export type ReaderFile = Readonly<{ bookId: string; bookFileId: string; editionSha256: string }>;
export type ReaderPersonalEvent = Readonly<{
  eventId: string;
  expectedRevision: number;
  action: "UPSERT" | "DELETE";
  value: unknown;
}>;
export type ReaderSessionEvent = Readonly<{
  sessionId: string;
  eventId: string;
  expectedRevision: number;
  action: "START" | "STOP";
}>;

export type LocalReaderRouteSource = Readonly<{
  ownerAuth: OwnerAuthenticator;
  authorizeReader: (request: FastifyRequest) => Promise<ReaderPrincipal | null>;
  now: () => number;
  listFiles: () => readonly ReaderFile[];
  registerFile: (file: ReaderFile) => void;
  readPersonal: (
    principal: ReaderPrincipal,
    fileId: string,
    editionSha256: string,
    kind: string,
    recordId: string,
  ) => unknown;
  writePersonal: (
    principal: ReaderPrincipal,
    fileId: string,
    editionSha256: string,
    kind: string,
    recordId: string,
    event: ReaderPersonalEvent,
  ) => Readonly<{ status: "LOCAL_RECORDED" | "CONFLICT"; revision: number }>;
  writeSession: (
    principal: ReaderPrincipal,
    fileId: string,
    editionSha256: string,
    event: ReaderSessionEvent,
  ) => Readonly<{ status: "LOCAL_RECORDED" | "CONFLICT"; revision: number }>;
  previewShelf: (
    principal: ReaderPrincipal,
    known: readonly ReaderFile[],
    selected: readonly ReaderFile[],
  ) => unknown;
}>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, i) => key === expected[i]);
}
function validFile(value: unknown): value is ReaderFile {
  return (
    record(value) &&
    exactKeys(value, ["bookId", "bookFileId", "editionSha256"]) &&
    typeof value.bookId === "string" &&
    ID.test(value.bookId) &&
    typeof value.bookFileId === "string" &&
    ID.test(value.bookFileId) &&
    typeof value.editionSha256 === "string" &&
    SHA256.test(value.editionSha256)
  );
}
function noStore(reply: FastifyReply): void {
  reply
    .header("cache-control", "no-store")
    .header("pragma", "no-cache")
    .header("x-content-type-options", "nosniff");
}
function validRevision(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Local Staging API only. It never calls Grimmory Official or mutates shelves. */
export function registerLocalReaderRoutes(
  server: FastifyInstance,
  source: LocalReaderRouteSource,
): void {
  const principals = new WeakMap<FastifyRequest, ReaderPrincipal>();
  const readerOnly = async (request: FastifyRequest, reply: FastifyReply) => {
    let principal: ReaderPrincipal | null = null;
    try {
      principal = await source.authorizeReader(request);
    } catch {
      principal = null;
    }
    if (!principal) return reply.code(401).send({ error: "PAIRED_READER_REQUIRED" });
    principals.set(request, principal);
  };
  const ownerAndCsrf = async (request: FastifyRequest, reply: FastifyReply) => {
    let owner = false;
    try {
      owner = await source.ownerAuth.authorizeOwner(request);
    } catch {
      owner = false;
    }
    if (!owner) return reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
    let csrf = false;
    try {
      csrf = await source.ownerAuth.verifyCsrf(request);
    } catch {
      csrf = false;
    }
    if (!csrf) return reply.code(403).send({ error: "CSRF_REQUIRED" });
  };

  server.get(`${PREFIX}/status`, { preValidation: readerOnly }, async (request, reply) => {
    noStore(reply);
    return reply.send({
      status: "PAIRED",
      deviceId: principals.get(request)!.deviceId,
      mode: "STAGING_LOCAL_ONLY",
      officialForwarding: "DENY_ALL",
      personalPersistence: "LOCAL_SQLITE_ONLY",
      shelfMutation: "OFF",
    });
  });

  server.get(`${PREFIX}/files`, { preValidation: readerOnly }, async (_request, reply) => {
    noStore(reply);
    try {
      return reply.send({ mode: "STAGING_LOCAL_ONLY", files: source.listFiles() });
    } catch {
      return reply.code(503).send({ error: "LOCAL_READER_FILES_UNAVAILABLE" });
    }
  });

  server.post<{ Body: unknown }>(
    `${PREFIX}/files`,
    { preValidation: ownerAndCsrf, bodyLimit: 2048 },
    async (request, reply) => {
      noStore(reply);
      if (!validFile(request.body))
        return reply.code(400).send({ error: "LOCAL_READER_FILE_INVALID" });
      try {
        source.registerFile(request.body);
        return reply.code(201).send({ status: "REGISTERED_LOCAL_TEST_FILE", file: request.body });
      } catch {
        return reply.code(409).send({ error: "LOCAL_READER_FILE_CONFLICT" });
      }
    },
  );

  server.get<{
    Params: { file: string; kind: string; record: string };
    Headers: { "x-edition-sha256"?: string };
  }>(
    `${PREFIX}/personal/:file/:kind/:record`,
    { preValidation: readerOnly },
    async (request, reply) => {
      noStore(reply);
      const { file, kind, record: recordId } = request.params;
      const hash = request.headers["x-edition-sha256"];
      if (
        !ID.test(file) ||
        !ID.test(recordId) ||
        !KINDS.has(kind) ||
        typeof hash !== "string" ||
        !SHA256.test(hash)
      )
        return reply.code(400).send({ error: "LOCAL_READER_PERSONAL_QUERY_INVALID" });
      try {
        return reply.send(
          source.readPersonal(principals.get(request)!, file, hash, kind, recordId) ?? {
            status: "NOT_FOUND",
          },
        );
      } catch {
        return reply.code(409).send({ error: "LOCAL_READER_FILE_MISMATCH_OR_REVOKED" });
      }
    },
  );

  server.put<{ Params: { file: string; kind: string; record: string }; Body: unknown }>(
    `${PREFIX}/personal/:file/:kind/:record`,
    { preValidation: readerOnly, bodyLimit: 8192 },
    async (request, reply) => {
      noStore(reply);
      const { file, kind, record: recordId } = request.params;
      const body = request.body;
      if (
        !ID.test(file) ||
        !ID.test(recordId) ||
        !KINDS.has(kind) ||
        !record(body) ||
        !exactKeys(body, ["editionSha256", "eventId", "expectedRevision", "action", "value"]) ||
        typeof body.editionSha256 !== "string" ||
        !SHA256.test(body.editionSha256) ||
        typeof body.eventId !== "string" ||
        !ID.test(body.eventId) ||
        !validRevision(body.expectedRevision) ||
        (body.action !== "UPSERT" && body.action !== "DELETE") ||
        (body.action === "DELETE" && body.value !== null)
      )
        return reply.code(400).send({ error: "LOCAL_READER_PERSONAL_EVENT_INVALID" });
      try {
        const result = source.writePersonal(
          principals.get(request)!,
          file,
          body.editionSha256,
          kind,
          recordId,
          {
            eventId: body.eventId,
            expectedRevision: body.expectedRevision,
            action: body.action,
            value: body.value,
          },
        );
        return reply.code(result.status === "CONFLICT" ? 409 : 200).send(result);
      } catch {
        return reply.code(409).send({ error: "LOCAL_READER_PERSONAL_REJECTED" });
      }
    },
  );

  server.post<{ Params: { session: string }; Body: unknown }>(
    `${PREFIX}/sessions/:session`,
    { preValidation: readerOnly, bodyLimit: 2048 },
    async (request, reply) => {
      noStore(reply);
      const body = request.body;
      if (
        !ID.test(request.params.session) ||
        !record(body) ||
        !exactKeys(body, [
          "bookFileId",
          "editionSha256",
          "eventId",
          "expectedRevision",
          "action",
        ]) ||
        typeof body.bookFileId !== "string" ||
        !ID.test(body.bookFileId) ||
        typeof body.editionSha256 !== "string" ||
        !SHA256.test(body.editionSha256) ||
        typeof body.eventId !== "string" ||
        !ID.test(body.eventId) ||
        !validRevision(body.expectedRevision) ||
        (body.action !== "START" && body.action !== "STOP")
      )
        return reply.code(400).send({ error: "LOCAL_READER_SESSION_EVENT_INVALID" });
      try {
        const result = source.writeSession(
          principals.get(request)!,
          body.bookFileId,
          body.editionSha256,
          {
            sessionId: request.params.session,
            eventId: body.eventId,
            expectedRevision: body.expectedRevision,
            action: body.action,
          },
        );
        return reply.code(result.status === "CONFLICT" ? 409 : 200).send(result);
      } catch {
        return reply.code(409).send({ error: "LOCAL_READER_SESSION_REJECTED" });
      }
    },
  );

  server.post<{ Body: unknown }>(
    `${PREFIX}/shelf-preview`,
    { preValidation: readerOnly, bodyLimit: 65536 },
    async (request, reply) => {
      noStore(reply);
      const body = request.body;
      const fileList = (value: unknown): value is ReaderFile[] =>
        Array.isArray(value) &&
        value.length <= 1000 &&
        value.every(validFile) &&
        new Set(value.map((file) => file.bookFileId)).size === value.length;
      if (
        !record(body) ||
        !exactKeys(body, ["known", "selected", "trigger"]) ||
        body.trigger !== "MANUAL_OWNER_ACTION" ||
        !fileList(body.known) ||
        !fileList(body.selected)
      )
        return reply.code(400).send({ error: "LOCAL_READER_SHELF_PREVIEW_INVALID" });
      try {
        return reply.send(source.previewShelf(principals.get(request)!, body.known, body.selected));
      } catch {
        return reply.code(409).send({ error: "LOCAL_READER_SHELF_PREVIEW_REJECTED" });
      }
    },
  );
}
