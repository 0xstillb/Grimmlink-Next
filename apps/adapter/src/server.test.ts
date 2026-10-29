import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("foundation server", () => {
  it("returns truthful local-only health and no API proxy", async () => {
    const server = buildServer();
    const health = await server.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status:"foundation-only", upstreamConnected:false, phase:"01" });
    const denied = await server.inject({ method: "GET", url: "/api/v1/books" });
    expect(denied.statusCode).toBe(404);
    await server.close();
  });
});
