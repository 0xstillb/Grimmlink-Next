import Fastify from "fastify";
import { expect, it } from "vitest";
import { registerOfflineRecoveryReadRoutes } from "./recovery-routes.js";

it("enforces fake owner auth for canonical GET and Last-Event-ID SSE replay", async () => {
  const server = Fastify({ logger: false });
  const events = [
    { seq: 1, jobId: "j1", transition: "ENQUEUED", code: "LOCAL_PLAN_ONLY", occurredAt: 1 },
    { seq: 2, jobId: "j1", transition: "UNKNOWN", code: "PROCESS_INTERRUPTED", occurredAt: 2 },
  ];
  registerOfflineRecoveryReadRoutes(server, {
    authorizeOwner: async (request) => request.headers.authorization === "Bearer test-owner",
    getJob: async (id) => id === "j1" ? { id, state: "UNKNOWN" } : null,
    replayEvents: async (afterSeq, limit) => events.filter(e => e.seq > afterSeq).slice(0,limit),
  });
  await server.ready();
  const unauthorized = await server.inject({ method: "GET", url: "/api/grimmlink/v2/local/jobs/j1" });
  expect(unauthorized.statusCode).toBe(403);
  expect(unauthorized.body).not.toContain("UNKNOWN");
  const headers = { authorization: "Bearer test-owner" };
  const job = await server.inject({ method: "GET", url: "/api/grimmlink/v2/local/jobs/j1", headers });
  expect(job.json()).toEqual({ job: { id: "j1", state: "UNKNOWN" } });
  const replay = await server.inject({ method: "GET", url: "/api/grimmlink/v2/local/jobs/events", headers: { ...headers, "last-event-id": "1" } });
  expect(replay.statusCode).toBe(200);
  expect(replay.headers["content-type"]).toContain("text/event-stream");
  expect(replay.body).toContain("id: 2");
  expect(replay.body).not.toContain("id: 1");
  const badCursor = await server.inject({ method: "GET", url: "/api/grimmlink/v2/local/jobs/events", headers: { ...headers, "last-event-id": "-1" } });
  expect(badCursor.statusCode).toBe(400);
  const missing = await server.inject({ method: "GET", url: "/api/grimmlink/v2/local/jobs/nope", headers });
  expect(missing.statusCode).toBe(404);
  await server.close();
});
