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
    expect(denied.statusCode).toBe(404);
    const contract = await server.inject({ method: "GET", url: "/openapi.json" });
    expect(contract.statusCode).toBe(200);
    expect(contract.json().paths["/health"].get.responses["200"]).toBeDefined();
    expect(contract.json().paths["/api/v1/books"]).toBeUndefined();
    expect(health.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
    await server.close();
  });
});
