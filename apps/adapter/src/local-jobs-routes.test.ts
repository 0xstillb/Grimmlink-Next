import Fastify from "fastify";
import { afterEach, expect, it, vi } from "vitest";
import { registerLocalJobsRoutes, type LocalJobsRouteSource } from "./local-jobs-routes.js";

const JOBS_PATH = "/api/grimmlink/v2/local/jobs";

function makeSource(): LocalJobsRouteSource & {
  setOwner(value: boolean): void;
  replayCalls: number[];
  controls: Array<{ id: string; action: string }>;
} {
  let owner = false;
  const replayCalls: number[] = [];
  const controls: Array<{ id: string; action: string }> = [];
  return {
    setOwner(value) {
      owner = value;
    },
    replayCalls,
    controls,
    authorizeOwner: async () => owner,
    verifyCsrf: async (request) => request.headers["x-csrf-token"] === "csrf-token-test",
    listJobs: () => [
      {
        id: "job-1",
        kind: "METADATA_MOCK",
        state: "PENDING",
        paused: false,
        attempts: 0,
        maxAttempts: 3,
        dueAt: 1_800_000_000_000,
        lastCode: null,
        createdAt: 1_799_999_999_000,
        updatedAt: 1_799_999_999_000,
      },
    ],
    replayEvents: (afterSeq, limit) => {
      replayCalls.push(afterSeq, limit);
      return [
        {
          seq: afterSeq + 1,
          jobId: "job-1",
          transition: "ENQUEUED",
          code: "LOCAL_PLAN_ONLY",
          occurredAt: 1_800_000_000_000,
        },
      ];
    },
    controlJob: (id, action) => {
      controls.push({ id, action });
      return { status: "APPLIED" };
    },
  };
}

afterEach(() => vi.restoreAllMocks());

it("requires owner authorization and returns a redacted local queue projection", async () => {
  const server = Fastify({ logger: false, ajv: { customOptions: { removeAdditional: false } } });
  const source = makeSource();
  registerLocalJobsRoutes(server, source);
  await server.ready();
  const anonymous = await server.inject({ method: "GET", url: JOBS_PATH });
  expect(anonymous.statusCode).toBe(403);
  expect(anonymous.json()).toEqual({ error: "OWNER_AUTH_REQUIRED" });

  source.setOwner(true);
  const response = await server.inject({ method: "GET", url: JOBS_PATH });
  expect(response.statusCode).toBe(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.json()).toEqual({
    jobs: [
      {
        id: "job-1",
        kind: "METADATA_MOCK",
        state: "PENDING",
        paused: false,
        attempts: 0,
        maxAttempts: 3,
        dueAt: 1_800_000_000_000,
        lastCode: null,
        createdAt: 1_799_999_999_000,
        updatedAt: 1_799_999_999_000,
      },
    ],
    execution: "DISABLED_NO_WORKER",
    officialWrites: "OFF",
  });
  expect(response.body).not.toContain("plan_hash");
  expect(response.body).not.toContain("book_id");
  await server.close();
});

it("replays bounded owner-only SSE events from Last-Event-ID", async () => {
  const server = Fastify({ logger: false, ajv: { customOptions: { removeAdditional: false } } });
  const source = makeSource();
  source.setOwner(true);
  registerLocalJobsRoutes(server, source);
  await server.ready();
  const response = await server.inject({
    method: "GET",
    url: `${JOBS_PATH}/events`,
    headers: { accept: "text/event-stream", "last-event-id": "8" },
  });
  expect(response.statusCode).toBe(200);
  expect(response.headers["content-type"]).toContain("text/event-stream");
  expect(source.replayCalls).toEqual([8, 100]);
  expect(response.body).toContain("id: 9\nevent: job\ndata: ");
  expect(() => JSON.parse(response.body.split("data: ")[1]!.split("\n")[0]!)).not.toThrow();

  const invalidCursor = await server.inject({
    method: "GET",
    url: `${JOBS_PATH}/events`,
    headers: { "last-event-id": "9%0Adata: forged" },
  });
  expect(invalidCursor.statusCode).toBe(400);
  expect(source.replayCalls).toEqual([8, 100]);
  await server.close();
});

it("requires CSRF and an exact allow-listed local action body", async () => {
  const server = Fastify({ logger: false, ajv: { customOptions: { removeAdditional: false } } });
  const source = makeSource();
  source.setOwner(true);
  registerLocalJobsRoutes(server, source);
  await server.ready();
  const path = `${JOBS_PATH}/job-1/control`;
  const noCsrf = await server.inject({ method: "POST", url: path, payload: { action: "PAUSE" } });
  expect(noCsrf.statusCode).toBe(403);
  expect(noCsrf.json()).toEqual({ error: "CSRF_REQUIRED" });

  const extraField = await server.inject({
    method: "POST",
    url: path,
    headers: { "x-csrf-token": "csrf-token-test" },
    payload: { action: "PAUSE", official: true },
  });
  expect(extraField.statusCode).toBe(400);

  const unsupported = await server.inject({
    method: "POST",
    url: path,
    headers: { "x-csrf-token": "csrf-token-test" },
    payload: { action: "CANCEL" },
  });
  expect(unsupported.statusCode).toBe(400);
  expect(source.controls).toEqual([]);

  const accepted = await server.inject({
    method: "POST",
    url: path,
    headers: { "x-csrf-token": "csrf-token-test" },
    payload: { action: "PAUSE" },
  });
  expect(accepted.statusCode).toBe(200);
  expect(accepted.json()).toEqual({ status: "APPLIED" });
  expect(source.controls).toEqual([{ id: "job-1", action: "PAUSE" }]);
  await server.close();
});
