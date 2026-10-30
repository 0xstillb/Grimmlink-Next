import type { FastifyInstance, FastifyRequest } from "fastify";

export interface LocalRecoveryEvent {
  seq: number;
  jobId: string;
  transition: string;
  code: string;
  occurredAt: number;
}
export interface LocalRecoveryReadSource {
  /** Must be bound to a trusted, live owner session by its caller. */
  authorizeOwner: (request: FastifyRequest) => Promise<boolean>;
  getJob: (id: string) => Promise<unknown | null>;
  replayEvents: (afterSeq: number, limit: number) => Promise<readonly LocalRecoveryEvent[]>;
}
function cursor(value: string | string[] | undefined): number {
  if (value === undefined || value === "") return 0;
  if (Array.isArray(value) || !/^(0|[1-9]\d{0,14})$/.test(value))
    throw new Error("Invalid replay cursor");
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error("Invalid replay cursor");
  return number;
}
function frame(event: LocalRecoveryEvent): string {
  if (
    !Number.isSafeInteger(event.seq) ||
    event.seq < 1 ||
    !/^[A-Z_]+$/.test(event.transition) ||
    !/^[A-Z_]+$/.test(event.code) ||
    !/^[\w:-]{1,120}$/.test(event.jobId) ||
    !Number.isSafeInteger(event.occurredAt)
  )
    throw new Error("Unsafe event");
  return `id: ${event.seq}\nevent: job\ndata: ${JSON.stringify(event)}\n\n`;
}
/**
 * Not mounted in the production Adapter. Its owner-authorizer must be backed by
 * a verified Official session before it is wired; otherwise all gateway paths
 * remain DENY_ALL. This factory is exercised with FAKE owners in Phase04.
 *
 * The SSE route is a finite, durable replay batch; later phases may add a
 * validated long-lived subscription. GET is the authoritative fallback.
 */
export function registerOfflineRecoveryReadRoutes(
  server: FastifyInstance,
  source: LocalRecoveryReadSource,
): void {
  const ownerOnly = async (
    request: FastifyRequest,
    reply: { code: (number: number) => { send: (body: object) => void } },
  ) => {
    if (!(await source.authorizeOwner(request)))
      reply.code(403).send({ error: "OWNER_AUTH_REQUIRED" });
  };
  server.get<{ Params: { id: string } }>(
    "/api/grimmlink/v2/local/jobs/:id",
    { preHandler: ownerOnly },
    async (request, reply) => {
      if (!/^[\w:-]{1,120}$/.test(request.params.id))
        return reply.code(400).send({ error: "INVALID_JOB_ID" });
      const job = await source.getJob(request.params.id);
      reply.header("cache-control", "no-store");
      return job === null ? reply.code(404).send({ error: "NOT_FOUND" }) : reply.send({ job });
    },
  );
  server.get(
    "/api/grimmlink/v2/local/jobs/events",
    { preHandler: ownerOnly },
    async (request, reply) => {
      let afterSeq: number;
      try {
        afterSeq = cursor(request.headers["last-event-id"]);
      } catch {
        return reply.code(400).send({ error: "INVALID_LAST_EVENT_ID" });
      }
      const events = await source.replayEvents(afterSeq, 100);
      const encoded = events.map(frame).join("");
      return reply
        .header("cache-control", "no-store")
        .header("x-content-type-options", "nosniff")
        .header("x-accel-buffering", "no")
        .type("text/event-stream; charset=utf-8")
        .send(encoded);
    },
  );
}
