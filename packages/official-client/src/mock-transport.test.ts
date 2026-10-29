import { describe, expect, it } from "vitest";
import {
  createMockOnlyOfficialClient,
  isMockVersionCapabilities,
  OfficialClientError,
  type MockReadRequest,
} from "./mock-transport.js";

const scope = { kind: "reader", subjectId: "user-123" } as const;
const correlationId = "123e4567-e89b-42d3-a456-426614174000";
const input = {
  path: "/api/mock-version",
  scope,
  correlationId,
  validate: isMockVersionCapabilities,
};
const ok = { status: 200, json: { version: "3.5.0", capabilities: ["opds"] } };

describe("Phase02 Official fake-only transport", () => {
  it("uses only an injected transport with GET, no credentials, and a typed response", async () => {
    const calls: MockReadRequest[] = [];
    const client = createMockOnlyOfficialClient({
      transport: async (request) => {
        calls.push(request);
        return ok;
      },
    });
    expect(await client.readJson(input)).toEqual(ok.json);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      method: "GET",
      path: "/api/mock-version",
      headers: { accept: "application/json", "x-correlation-id": correlationId },
      scope,
    });
    expect(calls[0]?.headers).not.toHaveProperty("authorization");
    expect(calls[0]?.headers).not.toHaveProperty("cookie");
    expect(JSON.stringify(calls)).not.toContain("passwordMD5");
  });

  it("retries only bounded safe GET on transient 503", async () => {
    let count = 0;
    const delays: number[] = [];
    const client = createMockOnlyOfficialClient({
      maxAttempts: 3,
      wait: async (duration) => {
        delays.push(duration);
      },
      transport: async () => {
        count++;
        return count < 3 ? { status: 503, json: { secret: "CANARY" } } : ok;
      },
    });
    expect(await client.readJson(input)).toEqual(ok.json);
    expect(count).toBe(3);
    expect(delays).toEqual([100, 200]);
  });

  it.each([401, 403, 404, 400, 418])("does not retry terminal HTTP %s", async (status) => {
    let count = 0;
    const client = createMockOnlyOfficialClient({
      transport: async () => {
        count++;
        return { status, json: "CANARY-SHOULD-NEVER-REFLECT" };
      },
      wait: async () => {},
    });
    await expect(client.readJson(input)).rejects.toBeInstanceOf(OfficialClientError);
    expect(count).toBe(1);
  });

  it.each([
    "http://evil.test/api/books",
    "//host/api/books",
    "/api/%2e%2e/secret",
    "/api/../secret",
    "/api/books?token=x",
    "/api/books#x",
    "/api//books",
    "/api/books/",
    "/not-api/books",
    "/api/KOREADER",
  ])("rejects unsafe or unverified request path %s without a transport call", async (path) => {
    let called = false;
    const client = createMockOnlyOfficialClient({
      transport: async () => {
        called = true;
        return ok;
      },
    });
    await expect(client.readJson({ ...input, path })).rejects.toMatchObject({
      code: "INVALID_REQUEST",
    });
    expect(called).toBe(false);
  });

  it("rejects invalid scope and correlation ID without transport calls", async () => {
    let count = 0;
    const client = createMockOnlyOfficialClient({
      transport: async () => {
        count++;
        return ok;
      },
    });
    await expect(
      client.readJson({ ...input, scope: { kind: "reader", subjectId: "../admin" } }),
    ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(client.readJson({ ...input, correlationId: "token" })).rejects.toMatchObject({
      code: "INVALID_REQUEST",
    });
    expect(count).toBe(0);
  });

  it("never reveals upstream network errors, invalid body data or their canary secrets", async () => {
    const network = createMockOnlyOfficialClient({
      maxAttempts: 1,
      transport: async () => {
        throw new Error("passwordMD5=SECRET_CANARY");
      },
    });
    await expect(network.readJson(input)).rejects.toMatchObject({
      code: "NETWORK_FAILURE",
      message: "NETWORK_FAILURE",
    });
    const invalid = createMockOnlyOfficialClient({
      transport: async () => ({
        status: 200,
        json: { version: "3.5.0", capabilities: ["opds"], passwordMD5: "SECRET_CANARY" },
      }),
    });
    // Unknown fields are deliberately not a confirmed Official DTO contract yet.
    expect(await invalid.readJson(input)).toHaveProperty("version", "3.5.0");
    expect(isMockVersionCapabilities({ version: "3.5", capabilities: ["ok", 2] })).toBe(false);
  });

  it("aborts a hanging injected mock on a bounded deadline", async () => {
    let aborted = false;
    const client = createMockOnlyOfficialClient({
      timeoutMs: 5,
      maxAttempts: 1,
      transport: async ({ signal }) =>
        new Promise(() => {
          signal.addEventListener(
            "abort",
            () => {
              aborted = true;
            },
            { once: true },
          );
        }),
    });
    await expect(client.readJson(input)).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(aborted).toBe(true);
  });

  it("rejects invalid client budgets", () => {
    expect(() =>
      createMockOnlyOfficialClient({ timeoutMs: Infinity, transport: async () => ok }),
    ).toThrow(OfficialClientError);
    expect(() =>
      createMockOnlyOfficialClient({ maxAttempts: 100, transport: async () => ok }),
    ).toThrow(OfficialClientError);
  });
});
