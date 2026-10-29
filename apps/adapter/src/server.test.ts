import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("foundation server", () => {
  it("returns truthful local-only health and no API proxy", async () => {
    const server = await buildServer();
    const health = await server.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({
      status: "foundation-only",
      upstreamConnected: false,
      phase: "01",
    });
    const denied = await server.inject({ method: "GET", url: "/api/v1/books" });
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toMatchObject({ error: "UPSTREAM_DENIED" });
    const contract = await server.inject({ method: "GET", url: "/openapi.json" });
    expect(contract.statusCode).toBe(200);
    expect(contract.json().paths["/health"].get.responses["200"]).toBeDefined();
    expect(contract.json().paths["/api/v1/books"]).toBeUndefined();
    expect(health.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
    const capabilities = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/capabilities",
    });
    expect(capabilities.statusCode).toBe(200);
    expect(capabilities.json()).toMatchObject({
      phase: "02",
      officialConnected: false,
      gatewayForwarding: "DENY_ALL",
      personalBridge: "OFF",
      nativeKosyncProgress: "OFF",
      fullE2e: "DEFERRED_TO_PHASE_09",
    });
    expect(
      contract.json().paths["/api/grimmlink/v2/capabilities"].get.responses["200"],
    ).toBeDefined();
    for (const method of ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"] as const) {
      const blocked = await server.inject({
        method,
        url: "/api/koreader/users/create",
        headers: { "x-auth-user": "canary-user", "x-auth-key": "canary-key" },
        payload: method === "POST" ? { passwordMD5: "canary-secret" } : undefined,
      });
      expect(blocked.statusCode).toBe(403);
      expect(blocked.body).not.toContain("canary");
    }
    const rewrite = await server.inject({
      method: "GET",
      url: "/health",
      headers: { "x-forwarded-host": "malicious.invalid" },
    });
    expect(rewrite.statusCode).toBe(400);
    const encoded = await server.inject({ method: "GET", url: "/api/%2fadmin" });
    expect(encoded.statusCode).toBe(400);
    await server.close();
  });
});
