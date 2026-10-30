import type { FastifyInstance, FastifyRequest } from "fastify";

type BackupPreviewDto = Readonly<{
  action: "PREVIEW_THEN_EXPLICIT_CONFIRM";
  bundleHash: string;
  token: string;
  bookIds: readonly string[];
  coverApply: "SEPARATE_DISABLED";
  writesAllowed: false;
}>;
type BackupConfirmDto = Readonly<{
  state: "VERIFIED" | "FAILED" | "UNKNOWN";
  code: string;
  officialConnected: false;
}>;
export interface IsolatedBackupRouteSource {
  authorizeOwner: (request: FastifyRequest) => Promise<boolean>;
  verifyMockCsrf: (request: FastifyRequest) => Promise<boolean>;
  getPreview: (backupId: string) => Promise<BackupPreviewDto | null>;
  confirmFake: (
    backupId: string,
    input: Readonly<{ bundleHash: string; token: string; idempotencyKey: string }>,
  ) => Promise<BackupConfirmDto>;
}
function safeId(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,119}$/.test(value);
}
function sha256(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

/**
 * OFFLINE CONTRACT FACTORY ONLY. Never mounted in the live adapter;
 * real trusted owner sessions, CSRF and Official CAS remain disabled.
 */
export function registerIsolatedBackupRoutes(
  server: FastifyInstance,
  source: IsolatedBackupRouteSource,
): void {
  const ownerOnly = async (
    request: FastifyRequest,
    reply: { code: (status: number) => { send: (body: object) => void } },
  ) => {
    if (!(await source.authorizeOwner(request)))
      reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
  };
  server.get<{ Params: { id: string } }>(
    "/api/grimmlink/v2/local/backups/:id/preview",
    { preHandler: ownerOnly },
    async (request, reply) => {
      if (!safeId(request.params.id)) return reply.code(400).send({ error: "INVALID_BACKUP_ID" });
      const value = await source.getPreview(request.params.id);
      reply.header("cache-control", "no-store");
      return value === null
        ? reply.code(404).send({ error: "NOT_FOUND" })
        : reply.send({ preview: value });
    },
  );
  server.post<{
    Params: { id: string };
    Body: { confirmed?: boolean; bundleHash?: string; token?: string; idempotencyKey?: string };
  }>(
    "/api/grimmlink/v2/local/backups/:id/confirm",
    { preHandler: ownerOnly },
    async (request, reply) => {
      if (!safeId(request.params.id)) return reply.code(400).send({ error: "INVALID_BACKUP_ID" });
      if (!(await source.verifyMockCsrf(request)))
        return reply.code(403).send({ error: "CSRF_REQUIRED" });
      const body = request.body;
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).sort().join(",") !== "bundleHash,confirmed,idempotencyKey,token" ||
        body.confirmed !== true ||
        typeof body.bundleHash !== "string" ||
        !sha256(body.bundleHash) ||
        typeof body.token !== "string" ||
        !sha256(body.token) ||
        typeof body.idempotencyKey !== "string" ||
        !safeId(body.idempotencyKey)
      )
        return reply.code(400).send({ error: "INVALID_CONFIRMATION" });
      const result = await source.confirmFake(request.params.id, {
        bundleHash: body.bundleHash,
        token: body.token,
        idempotencyKey: body.idempotencyKey,
      });
      reply.header("cache-control", "no-store");
      // HTTP 200 must not imply a successful restore; the explicit state is authoritative.
      return reply.send(result);
    },
  );
}
