import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";

const JOB_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$/;
const JOBS_PATH = "/api/grimmlink/v2/local/jobs";
const EVENTS_PATH = `${JOBS_PATH}/events`;
const MAX_REPLAY_EVENTS = 100;
const ERROR_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["error"],
  properties: { error: { type: "string" } },
} as const;
const JOB_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "kind",
    "state",
    "paused",
    "attempts",
    "maxAttempts",
    "dueAt",
    "lastCode",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$" },
    kind: { type: "string", enum: ["METADATA_MOCK", "COVER_MOCK", "RESTORE_PREVIEW"] },
    state: {
      type: "string",
      enum: ["PENDING", "LEASED", "FAILED", "UNKNOWN", "DONE", "CANCELED"],
    },
    paused: { type: "boolean" },
    attempts: { type: "integer", minimum: 0, maximum: 5 },
    maxAttempts: { type: "integer", minimum: 1, maximum: 5 },
    dueAt: { type: "integer", minimum: 0 },
    lastCode: { anyOf: [{ type: "string", pattern: "^[A-Z_]{1,64}$" }, { type: "null" }] },
    createdAt: { type: "integer", minimum: 0 },
    updatedAt: { type: "integer", minimum: 0 },
  },
} as const;
const JOBS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["jobs", "execution", "officialWrites"],
  properties: {
    jobs: { type: "array", maxItems: 100, items: JOB_SUMMARY_SCHEMA },
    execution: { type: "string", const: "DISABLED_NO_WORKER" },
    officialWrites: { type: "string", const: "OFF" },
  },
} as const;

export type LocalJobAction = "PAUSE" | "RESUME" | "RETRY";
export type LocalJobControlResult =
  | Readonly<{ status: "APPLIED" }>
  | Readonly<{ status: "RETRY_SCHEDULED"; dueAt: number }>
  | Readonly<{ status: "NOT_FOUND" | "CONFLICT" }>;

export type LocalJobSummary = Readonly<{
  id: string;
  kind: "METADATA_MOCK" | "COVER_MOCK" | "RESTORE_PREVIEW";
  state: "PENDING" | "LEASED" | "FAILED" | "UNKNOWN" | "DONE" | "CANCELED";
  paused: boolean;
  attempts: number;
  maxAttempts: number;
  dueAt: number;
  lastCode: string | null;
  createdAt: number;
  updatedAt: number;
}>;

export type LocalJobEvent = Readonly<{
  seq: number;
  jobId: string;
  transition: string;
  code: string;
  occurredAt: number;
}>;

export type LocalJobsRouteSource = Readonly<{
  authorizeOwner: OwnerAuthenticator["authorizeOwner"];
  verifyCsrf: OwnerAuthenticator["verifyCsrf"];
  listJobs: () => readonly LocalJobSummary[];
  replayEvents: (afterSeq: number, limit: number) => readonly LocalJobEvent[];
  controlJob: (id: string, action: LocalJobAction) => LocalJobControlResult;
}>;

function parseAfterSeq(value: string | string[] | undefined): number | null {
  if (value === undefined || value === "") return 0;
  if (Array.isArray(value) || !/^(0|[1-9][0-9]{0,14})$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function encodeEvent(event: {
  seq: number;
  jobId: string;
  transition: string;
  code: string;
  occurredAt: number;
}): string {
  if (
    !Number.isSafeInteger(event.seq) ||
    event.seq < 1 ||
    !JOB_ID.test(event.jobId) ||
    !/^[A-Z_]{1,64}$/.test(event.transition) ||
    !/^[A-Z_]{1,64}$/.test(event.code) ||
    !Number.isSafeInteger(event.occurredAt) ||
    event.occurredAt < 0
  ) {
    throw new Error("INVALID_LOCAL_JOB_EVENT");
  }
  return `id: ${event.seq}\nevent: job\ndata: ${JSON.stringify(event)}\n\n`;
}

/** Owner-authenticated Control Center API for the durable, local-only job ledger. */
export function registerLocalJobsRoutes(
  server: FastifyInstance,
  source: LocalJobsRouteSource,
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
    JOBS_PATH,
    {
      preHandler: ownerOnly,
      schema: {
        tags: ["Local Jobs"],
        summary: "Read the local durable queue projection",
        description:
          "Owner-authenticated local metadata only. No worker, NAS transport or Official write is enabled.",
        response: {
          200: JOBS_RESPONSE_SCHEMA,
          403: ERROR_RESPONSE_SCHEMA,
          503: ERROR_RESPONSE_SCHEMA,
        },
      },
    },
    async (_request, reply) =>
      reply.header("cache-control", "no-store").header("x-content-type-options", "nosniff").send({
        jobs: source.listJobs(),
        execution: "DISABLED_NO_WORKER",
        officialWrites: "OFF",
      }),
  );

  server.get(
    EVENTS_PATH,
    {
      preHandler: ownerOnly,
      schema: {
        tags: ["Local Jobs"],
        summary: "Replay a bounded local job event stream",
        description: "Finite owner-authenticated SSE replay, limited to the next 100 local events.",
        headers: {
          type: "object",
          additionalProperties: true,
          properties: {
            "last-event-id": {
              type: "string",
              maxLength: 15,
              pattern: "^(0|[1-9][0-9]{0,14})$",
            },
          },
        },
        response: {
          200: {
            description: "Finite local job events",
            content: { "text/event-stream": { schema: { type: "string" } } },
          },
          400: ERROR_RESPONSE_SCHEMA,
          403: ERROR_RESPONSE_SCHEMA,
          503: ERROR_RESPONSE_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      const afterSeq = parseAfterSeq(request.headers["last-event-id"]);
      if (afterSeq === null) return reply.code(400).send({ error: "INVALID_LAST_EVENT_ID" });
      try {
        const body = source.replayEvents(afterSeq, MAX_REPLAY_EVENTS).map(encodeEvent).join("");
        return reply
          .header("cache-control", "no-store")
          .header("x-content-type-options", "nosniff")
          .header("x-accel-buffering", "no")
          .type("text/event-stream; charset=utf-8")
          .send(body);
      } catch {
        return reply.code(503).send({ error: "LOCAL_JOB_EVENTS_UNAVAILABLE" });
      }
    },
  );

  server.post<{
    Params: { id: string };
    Body: { action?: unknown };
  }>(
    `${JOBS_PATH}/:id/control`,
    {
      preHandler: ownerAndCsrf,
      bodyLimit: 1024,
      schema: {
        tags: ["Local Jobs"],
        summary: "Apply an owner action to a local pending job",
        description: "PAUSE, RESUME and failed-job RETRY mutate only the local SQLite ledger.",
        params: {
          type: "object",
          additionalProperties: false,
          required: ["id"],
          properties: {
            id: { type: "string", pattern: "^[A-Za-z0-9][A-Za-z0-9:_-]{0,119}$" },
          },
        },
        body: {
          type: "object",
          additionalProperties: false,
          required: ["action"],
          properties: { action: { type: "string", enum: ["PAUSE", "RESUME", "RETRY"] } },
        },
        response: {
          200: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["status"],
                properties: { status: { type: "string", const: "APPLIED" } },
              },
              {
                type: "object",
                additionalProperties: false,
                required: ["status", "dueAt"],
                properties: {
                  status: { type: "string", const: "RETRY_SCHEDULED" },
                  dueAt: { type: "integer", minimum: 0 },
                },
              },
            ],
          },
          400: ERROR_RESPONSE_SCHEMA,
          403: ERROR_RESPONSE_SCHEMA,
          404: ERROR_RESPONSE_SCHEMA,
          409: ERROR_RESPONSE_SCHEMA,
          503: ERROR_RESPONSE_SCHEMA,
        },
      },
    },
    async (request, reply) => {
      if (!JOB_ID.test(request.params.id)) return reply.code(400).send({ error: "INVALID_JOB_ID" });
      const body = request.body;
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length !== 1 ||
        !("action" in body) ||
        (body.action !== "PAUSE" && body.action !== "RESUME" && body.action !== "RETRY")
      ) {
        return reply.code(400).send({ error: "INVALID_LOCAL_JOB_ACTION" });
      }
      const result = source.controlJob(request.params.id, body.action);
      reply.header("cache-control", "no-store");
      if (result.status === "NOT_FOUND")
        return reply.code(404).send({ error: "LOCAL_JOB_NOT_FOUND" });
      if (result.status === "CONFLICT")
        return reply.code(409).send({ error: "LOCAL_JOB_STATE_CONFLICT" });
      return reply.send(result);
    },
  );
}
