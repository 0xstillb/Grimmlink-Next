import { describe, expect, it } from "vitest";
import { buildServer, getAdapterDiagnostics } from "./server.js";

describe("foundation server", () => {
  it("returns truthful local-only health and no API proxy", async () => {
    const server = await buildServer();
    const diagnostics = getAdapterDiagnostics(server);
    expect(diagnostics).not.toBeNull();
    const buffer = diagnostics!.buffers.adapter!;
    expect(buffer.read()).toEqual([]);
    diagnostics!.leases.enable({
      module: "adapter",
      level: "debug",
      durationMs: 30_000,
      adminAuthorized: true,
    });
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
    const diagnosticLine = buffer.read({
      code: "REQUEST_SUMMARY",
      requestId: health.headers["x-correlation-id"],
      limit: 1,
    })[0];
    expect(diagnosticLine).toBeDefined();
    const safeDiagnostic = JSON.parse(diagnosticLine!);
    expect(safeDiagnostic.req).toEqual({ id: health.headers["x-correlation-id"], method: "GET" });
    expect(diagnosticLine).not.toContain("/health");
    diagnostics!.leases.disable({ module: "adapter", adminAuthorized: true });
    const capabilities = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/capabilities",
    });
    expect(capabilities.statusCode).toBe(200);
    expect(capabilities.json()).toMatchObject({
      phase: "02",
      deploymentMode: "SINGLE_OWNER_PRIVATE",
      independentSecurityReview: "DEFERRED_TO_PHASE_09",
      officialConnected: false,
      gatewayForwarding: "DENY_ALL",
      personalBridge: "OFF",
      nativeKosyncProgress: "OFF",
      fullE2e: "DEFERRED_TO_PHASE_09",
    });
    expect(
      contract.json().paths["/api/grimmlink/v2/capabilities"].get.responses["200"],
    ).toBeDefined();
    const version = await server.inject({ method: "GET", url: "/api/grimmlink/v2/version" });
    expect(version.statusCode).toBe(200);
    expect(version.json()).toEqual({
      adapterVersion: "0.1.0",
      apiVersion: "v2",
      phase: "02",
      mode: "MOCK_ONLY",
      officialConnected: false,
      releaseAuthorization: "NOT_AUTHORIZED",
    });
    expect(contract.json().paths["/api/grimmlink/v2/version"].get.responses["200"]).toBeDefined();
    for (const method of ["HEAD", "POST", "OPTIONS"] as const) {
      const rejected = await server.inject({ method, url: "/api/grimmlink/v2/version" });
      expect(rejected.statusCode).toBe(403);
    }
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
