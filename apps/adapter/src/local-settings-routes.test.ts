import Fastify from "fastify";
import { expect, it } from "vitest";
import { registerLocalSettingsRoutes } from "./local-settings-routes.js";

it("requires an owner session and returns only the immutable fail-closed policy", async () => {
  const server = Fastify({ logger: false });
  let owner = false;
  registerLocalSettingsRoutes(server, {
    authorizeOwner: async () => owner,
    verifyCsrf: async () => false,
    registerRoutes: () => undefined,
  });
  await server.ready();

  const anonymous = await server.inject({
    method: "GET",
    url: "/api/grimmlink/v2/local/settings/status",
  });
  expect(anonymous.statusCode).toBe(403);
  expect(anonymous.json()).toEqual({ error: "OWNER_AUTH_REQUIRED" });

  owner = true;
  const response = await server.inject({
    method: "GET",
    url: "/api/grimmlink/v2/local/settings/status",
  });
  expect(response.statusCode).toBe(200);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.json()).toEqual({
    source: "CODE_ENFORCED_FAIL_CLOSED_POLICY",
    mode: "SINGLE_OWNER_PRIVATE",
    officialForwarding: "DENY_ALL",
    protectedWrites: "OFF",
    nativeKosync: "OFF",
    personalBridge: "OFF",
    sessionBridge: "OFF",
    resetProgress: "OFF",
    managedProjection: "OFF",
    automaticUpdates: "OFF",
    production: "NOT_AUTHORIZED",
  });
  await server.close();
});
