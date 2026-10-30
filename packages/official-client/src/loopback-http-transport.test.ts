import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it } from "vitest";
import { createMockOnlyOfficialClient, isMockVersionCapabilities } from "./mock-transport.js";
import { createLoopbackJsonTransport } from "./loopback-http-transport.js";

const correlationId = "123e4567-e89b-42d3-a456-426614174000";
const input = {
  path: "/api/mock-version",
  correlationId,
  scope: { kind: "reader", subjectId: "reader_1" } as const,
  validate: isMockVersionCapabilities,
};

async function withLoopback<T>(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  test: (port: number) => Promise<T>,
): Promise<T> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address() as AddressInfo;
    return await test(address.port);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

describe("Phase02 loopback HTTP mechanics without live Official connectivity", () => {
  it("receives typed JSON and sends no cookies, bearer, KO or user secret", async () => {
    await withLoopback(
      (req, res) => {
        expect(req.method).toBe("GET");
        expect(req.url).toBe("/api/mock-version");
        expect(req.headers["x-correlation-id"]).toBe(correlationId);
        expect(req.headers.authorization).toBeUndefined();
        expect(req.headers.cookie).toBeUndefined();
        expect(req.headers["x-auth-key"]).toBeUndefined();
        expect(req.headers["x-auth-user"]).toBeUndefined();
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ version: "3.5.0", capabilities: ["opds"] }));
      },
      async (port) => {
        const client = createMockOnlyOfficialClient({
          transport: createLoopbackJsonTransport(port),
          maxAttempts: 1,
        });
        await expect(client.readJson(input)).resolves.toMatchObject({
          version: "3.5.0",
          capabilities: ["opds"],
        });
      },
    );
  });

  it("never follows redirects or reflects upstream secret error bodies", async () => {
    let count = 0;
    await withLoopback(
      (_req, res) => {
        count++;
        res.writeHead(302, { Location: "http://evil.invalid/secrets" });
        res.end("CANARY_SECRET_PASSWORD");
      },
      async (port) => {
        const client = createMockOnlyOfficialClient({
          transport: createLoopbackJsonTransport(port),
          maxAttempts: 2,
          wait: async () => {},
        });
        await expect(client.readJson(input)).rejects.toMatchObject({
          code: "INVALID_RESPONSE",
          message: "INVALID_RESPONSE",
        });
        expect(count).toBe(1);
      },
    );
  });

  it("rejects oversized and malformed JSON without leaking content", async () => {
    await withLoopback(
      (_req, res) => {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ canary: "SECRET".repeat(300) }));
      },
      async (port) => {
        const client = createMockOnlyOfficialClient({
          transport: createLoopbackJsonTransport(port, 128),
          maxAttempts: 1,
        });
        await expect(client.readJson(input)).rejects.toMatchObject({
          code: "INVALID_RESPONSE",
        });
      },
    );
  });

  it("rejects non-JSON responses without reflecting HTML or cookies", async () => {
    await withLoopback(
      (_req, res) => {
        res.setHeader("content-type", "text/html");
        res.setHeader("set-cookie", "secret=CANARY");
        res.end("<html>CANARY</html>");
      },
      async (port) => {
        const client = createMockOnlyOfficialClient({
          transport: createLoopbackJsonTransport(port),
          maxAttempts: 1,
        });
        await expect(client.readJson(input)).rejects.toMatchObject({
          code: "INVALID_RESPONSE",
          message: "INVALID_RESPONSE",
        });
      },
    );
  });

  it("refuses unsafe port, untrusted absolute or encoded targets", async () => {
    expect(() => createLoopbackJsonTransport(80)).toThrow("INVALID_REQUEST");
    expect(() => createLoopbackJsonTransport(70000)).toThrow("INVALID_REQUEST");
    await withLoopback(
      (_req, res) => {
        res.setHeader("content-type", "application/json");
        res.end("{}");
      },
      async (port) => {
        const transport = createLoopbackJsonTransport(port);
        await expect(
          transport({
            method: "GET",
            path: "/api/%2e%2e/secret",
            scope: input.scope,
            signal: new AbortController().signal,
            headers: { accept: "application/json", "x-correlation-id": correlationId },
          }),
        ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
      },
    );
  });
});
