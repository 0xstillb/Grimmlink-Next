import Fastify from "fastify";
import { expect, it } from "vitest";
import { registerIsolatedPhase05Routes } from "./phase05-routes.js";

const hash = "a".repeat(32);
it("isolated Phase05 routes reject anonymous owner/reader, deny missing CSRF and return explicit conflict", async () => {
  const server = Fastify();
  let paired = 0;
  let revoked = 0;
  let recorded = 0;
  registerIsolatedPhase05Routes(server, {
    authorizeOwner: async (req) => req.headers["x-test-owner"] === "yes",
    verifyMockCsrf: async (req) => req.headers["x-test-csrf"] === "yes",
    authorizeReader: async (req) => req.headers["x-test-reader"] === "yes",
    pairMockDevice: async (deviceId) => {
      paired++;
      return { deviceId, token: "test-secret-only" };
    },
    revokeMockDevice: async () => {
      revoked++;
    },
    getMockPosition: async () => ({ position: "native xpointer", revision: 4 }),
    recordMockPosition: async () => {
      recorded++;
      return { state: "CONFLICT", revision: 4 };
    },
  });
  await server.ready();
  const body = { deviceId: "reader1" };
  expect(
    (
      await server.inject({
        method: "POST",
        url: "/api/grimmlink/v2/local/mock-pair",
        payload: body,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await server.inject({
        method: "POST",
        url: "/api/grimmlink/v2/local/mock-pair",
        payload: body,
        headers: { "x-test-owner": "yes" },
      })
    ).statusCode,
  ).toBe(403);
  const result = await server.inject({
    method: "POST",
    url: "/api/grimmlink/v2/local/mock-pair",
    payload: body,
    headers: { "x-test-owner": "yes", "x-test-csrf": "yes" },
  });
  expect(result.statusCode).toBe(201);
  expect(result.headers["cache-control"]).toBe("no-store");
  expect(paired).toBe(1);
  expect(
    (
      await server.inject({
        method: "GET",
        url: "/api/grimmlink/v2/local/mock-kosync/" + hash,
      })
    ).statusCode,
  ).toBe(403);
  const conflict = await server.inject({
    method: "PUT",
    url: "/api/grimmlink/v2/local/mock-kosync/" + hash,
    headers: { "x-test-reader": "yes" },
    payload: { eventId: "evt", position: "native", expectedRevision: 3 },
  });
  expect(conflict.statusCode).toBe(409);
  expect(conflict.json()).toEqual({ state: "CONFLICT", revision: 4 });
  expect(recorded).toBe(1);
  await server.inject({
    method: "POST",
    url: "/api/grimmlink/v2/local/mock-revoke",
    payload: body,
    headers: { "x-test-owner": "yes", "x-test-csrf": "yes" },
  });
  expect(revoked).toBe(1);
  await server.close();
});
