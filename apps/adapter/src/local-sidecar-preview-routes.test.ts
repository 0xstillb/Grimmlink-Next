import Fastify from "fastify";
import { expect, it } from "vitest";
import { registerLocalSidecarPreviewRoutes } from "./local-sidecar-preview-routes.js";

const PATH = "/api/grimmlink/v2/local/sidecar/preview";
const VALID_SIDECAR = '{"metadata":{"title":"Sidecar preview","seriesNumber":2.5}}';

function setup() {
  const server = Fastify({ logger: false, ajv: { customOptions: { removeAdditional: false } } });
  let owner = false;
  registerLocalSidecarPreviewRoutes(server, {
    authorizeOwner: async () => owner,
    verifyCsrf: async (request) => request.headers["x-csrf-token"] === "test-csrf",
    registerRoutes: () => undefined,
  });
  return { server, setOwner: (value: boolean) => (owner = value) };
}

it("requires owner and CSRF, then returns a preview-only Sidecar projection", async () => {
  const { server, setOwner } = setup();
  await server.ready();
  const anonymous = await server.inject({
    method: "POST",
    url: PATH,
    payload: { sidecarJson: VALID_SIDECAR },
  });
  expect(anonymous.statusCode).toBe(403);
  expect(anonymous.json()).toEqual({ error: "OWNER_AUTH_REQUIRED" });

  setOwner(true);
  const noCsrf = await server.inject({
    method: "POST",
    url: PATH,
    payload: { sidecarJson: VALID_SIDECAR },
  });
  expect(noCsrf.statusCode).toBe(403);
  expect(noCsrf.json()).toEqual({ error: "CSRF_REQUIRED" });

  const response = await server.inject({
    method: "POST",
    url: PATH,
    headers: { "x-csrf-token": "test-csrf" },
    payload: { sidecarJson: VALID_SIDECAR },
  });
  expect(response.statusCode).toBe(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.json()).toEqual({
    metadata: { title: "Sidecar preview", seriesNumber: 2.5 },
    action: "PREVIEW_ONLY",
    writesAllowed: false,
    source: "OWNER_SELECTED_SIDECAR",
    importsEnabled: false,
    adjacentWriteEnabled: false,
  });
  expect(response.body).not.toContain(VALID_SIDECAR);
  await server.close();
});

it("rejects extra envelope fields, invalid UTF-8 JSON, and malformed scalars", async () => {
  const { server, setOwner } = setup();
  setOwner(true);
  await server.ready();
  const headers = { "x-csrf-token": "test-csrf" };
  const extra = await server.inject({
    method: "POST",
    url: PATH,
    headers,
    payload: { sidecarJson: VALID_SIDECAR, adjacentWrite: true },
  });
  expect(extra.statusCode).toBe(400);

  for (const sidecarJson of ["not-json", '{"metadata":{"title":"\u0001"}}', '{"title":4}']) {
    const response = await server.inject({
      method: "POST",
      url: PATH,
      headers,
      payload: { sidecarJson },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "SIDECAR_PREVIEW_INVALID" });
  }
  await server.close();
});
