import Fastify from "fastify";
import { expect, it } from "vitest";
import { registerLocalScreenStatusRoutes } from "./local-screen-status-routes.js";

it("requires owner authentication and reports missing providers without inventing data", async () => {
  const server = Fastify({ logger: false });
  let owner = false;
  registerLocalScreenStatusRoutes(server, {
    authorizeOwner: async () => owner,
    verifyCsrf: async () => false,
    registerRoutes: () => undefined,
  });
  await server.ready();

  const anonymous = await server.inject({
    method: "GET",
    url: "/api/grimmlink/v2/local/screens/status",
  });
  expect(anonymous.statusCode).toBe(403);
  expect(anonymous.json()).toEqual({ error: "OWNER_AUTH_REQUIRED" });

  owner = true;
  const response = await server.inject({
    method: "GET",
    url: "/api/grimmlink/v2/local/screens/status",
  });
  expect(response.statusCode).toBe(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.json()).toEqual({
    source: "NO_DOMAIN_PROVIDER_CONFIGURED",
    identity: { status: "UNAVAILABLE", reason: "TRUSTED_IDENTITY_PROVIDER_NOT_CONFIGURED" },
    reading: { status: "UNAVAILABLE", reason: "READER_READBACK_PROVIDER_NOT_CONFIGURED" },
    opds: { status: "UNAVAILABLE", reason: "CATALOG_PROVIDER_NOT_CONFIGURED" },
  });
  await server.close();
});
