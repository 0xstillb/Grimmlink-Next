import Fastify from "fastify";
import { expect, it } from "vitest";
import { registerIsolatedPhase07Routes } from "./phase07-routes.js";

it("isolates mock personal/session requests and manually guarded shelf preview", async () => {
  const server = Fastify();
  let writes = 0;
  let previews = 0;
  registerIsolatedPhase07Routes(server, {
    authorizeOwner: async (r) => r.headers["x-mock-owner"] === "yes",
    verifyMockCsrf: async (r) => r.headers["x-mock-csrf"] === "yes",
    authorizeReader: async (r) => r.headers["x-mock-reader"] === "yes",
    getMockPersonal: async () => ({ revision: 1, deleted: false, value: { score: 5 } }),
    putMockPersonal: async () => {
      writes++;
      return { status: "CONFLICT", revision: 3 };
    },
    putMockSession: async () => ({ status: "LOCAL_RECORDED", revision: 1 }),
    previewMockShelf: async () => {
      previews++;
      return { mode: "MANUAL_PREVIEW_ONLY", add: ["file2"], remove: [] };
    },
  });
  await server.ready();
  const url = "/api/grimmlink/v2/local/mock-personal/file1/RATING/rating";
  const item = {
    eventId: "rating_ev",
    expectedRevision: 0,
    action: "UPSERT",
    value: { kind: "RATING", score: 5 },
  };
  expect((await server.inject({ method: "PUT", url, payload: item })).statusCode).toBe(403);
  expect(
    (
      await server.inject({
        method: "PUT",
        url,
        payload: { ...item, ownerId: "forged" },
        headers: { "x-mock-reader": "yes" },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await server.inject({
        method: "PUT",
        url,
        payload: { ...item, action: "DELETE", value: null },
        headers: { "x-mock-reader": "yes" },
      })
    ).statusCode,
  ).toBe(400);
  const conflict = await server.inject({
    method: "PUT",
    url,
    payload: item,
    headers: { "x-mock-reader": "yes" },
  });
  expect(conflict.statusCode).toBe(409);
  expect(conflict.json()).toEqual({ status: "CONFLICT", revision: 3 });
  expect(conflict.headers["cache-control"]).toBe("no-store");
  expect(writes).toBe(1);
  const read = await server.inject({
    method: "GET",
    url,
    headers: { "x-mock-reader": "yes" },
  });
  expect(read.json()).toEqual({ revision: 1, deleted: false, value: { score: 5 } });
  expect(
    (
      await server.inject({
        method: "POST",
        url: "/api/grimmlink/v2/local/mock-session/session1",
        headers: { "x-mock-reader": "yes" },
        payload: { eventId: "start", expectedRevision: 0, action: "START", ownerId: "forged" },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await server.inject({
        method: "POST",
        url: "/api/grimmlink/v2/local/mock-session/session1",
        headers: { "x-mock-reader": "yes" },
        payload: { eventId: "start", expectedRevision: 0, action: "START" },
      })
    ).json(),
  ).toEqual({ status: "LOCAL_RECORDED", revision: 1 });
  const shelf = "/api/grimmlink/v2/local/mock-shelf-preview";
  const body = { trigger: "MANUAL_OWNER_ACTION", known: ["file1"], selected: ["file2"] };
  expect((await server.inject({ method: "POST", url: shelf, payload: body })).statusCode).toBe(403);
  expect(
    (
      await server.inject({
        method: "POST",
        url: shelf,
        headers: { "x-mock-owner": "yes" },
        payload: body,
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (
      await server.inject({
        method: "POST",
        url: shelf,
        headers: { "x-mock-owner": "yes", "x-mock-csrf": "yes" },
        payload: { ...body, trigger: "AUTO" },
      })
    ).statusCode,
  ).toBe(400);
  const result = await server.inject({
    method: "POST",
    url: shelf,
    headers: { "x-mock-owner": "yes", "x-mock-csrf": "yes" },
    payload: body,
  });
  expect(result.json()).toEqual({ mode: "MANUAL_PREVIEW_ONLY", add: ["file2"], remove: [] });
  expect(previews).toBe(1);
  await server.close();
});
