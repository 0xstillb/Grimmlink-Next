import { createHash } from "node:crypto";
import Fastify from "fastify";
import { DiagnosticLeases, SafeLogBuffer } from "@grimmlink/observability";
import { expect, it } from "vitest";
import { registerIsolatedDiagnosticsRoutes } from "./diagnostics-routes.js";

it("guards isolated diagnostics reads, filters safe logs, and requires owner CSRF for mutations", async () => {
  const server = Fastify();
  let now = 1_000;
  const logs = new SafeLogBuffer("adapter", { now: () => now });
  const leases = new DiagnosticLeases();
  logs.write(
    JSON.stringify({
      level: 30,
      time: now,
      module: "adapter",
      msg: "SCOPED_DIAGNOSTIC",
      code: "REQUEST_SUMMARY",
      count: 2,
    }) + "\n",
  );
  logs.write(
    JSON.stringify({ level: 30, time: now, module: "adapter", msg: "untrusted raw data" }) + "\n",
  );
  registerIsolatedDiagnosticsRoutes(server, {
    buffers: { adapter: logs },
    leases,
    authorizeOwner: async (request) => request.headers["x-owner"] === "yes",
    verifyCsrf: async (request) => request.headers["x-csrf"] === "yes",
    now: () => now,
  });
  await server.ready();

  const logsUrl = "/api/grimmlink/v2/local/diagnostics/adapter/logs";
  expect((await server.inject({ method: "GET", url: logsUrl })).statusCode).toBe(403);
  const read = await server.inject({
    method: "GET",
    url: `${logsUrl}?code=REQUEST_SUMMARY&limit=10`,
    headers: { "x-owner": "yes" },
  });
  expect(read.statusCode).toBe(200);
  expect(read.headers["cache-control"]).toBe("no-store");
  expect(read.json()).toEqual({
    module: "adapter",
    lines: [
      JSON.stringify({
        level: 30,
        time: now,
        module: "adapter",
        msg: "SCOPED_DIAGNOSTIC",
        code: "REQUEST_SUMMARY",
        count: 2,
      }) + "\n",
    ],
  });
  expect(
    (
      await server.inject({
        method: "GET",
        url: `${logsUrl}?limit=501`,
        headers: { "x-owner": "yes" },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (
      await server.inject({
        method: "GET",
        url: "/api/grimmlink/v2/local/diagnostics/other/logs",
        headers: { "x-owner": "yes" },
      })
    ).statusCode,
  ).toBe(404);

  const leaseUrl = "/api/grimmlink/v2/local/diagnostics/adapter/lease";
  expect(
    (
      await server.inject({
        method: "PUT",
        url: leaseUrl,
        headers: { "x-owner": "yes" },
        payload: { level: "debug", durationMs: 1000 },
      })
    ).statusCode,
  ).toBe(403);
  const enabled = await server.inject({
    method: "PUT",
    url: leaseUrl,
    headers: { "x-owner": "yes", "x-csrf": "yes" },
    payload: { level: "debug", durationMs: 1000 },
  });
  expect(enabled.statusCode).toBe(200);
  expect(enabled.json()).toEqual({ module: "adapter", level: "debug", expiresAt: 2_000 });
  expect(
    (
      await server.inject({
        method: "PUT",
        url: leaseUrl,
        headers: { "x-owner": "yes", "x-csrf": "yes" },
        payload: { level: "trace", durationMs: 300_001 },
      })
    ).statusCode,
  ).toBe(400);
  expect(
    (await server.inject({ method: "GET", url: leaseUrl, headers: { "x-owner": "yes" } })).json(),
  ).toEqual({ module: "adapter", level: "debug", expiresAt: 2_000 });
  const disabled = await server.inject({
    method: "DELETE",
    url: leaseUrl,
    headers: { "x-owner": "yes", "x-csrf": "yes" },
  });
  expect(disabled.json()).toEqual({ module: "adapter", level: "info", expiresAt: null });

  expect(
    (await server.inject({ method: "DELETE", url: logsUrl, headers: { "x-owner": "yes" } }))
      .statusCode,
  ).toBe(403);
  const cleared = await server.inject({
    method: "DELETE",
    url: logsUrl,
    headers: { "x-owner": "yes", "x-csrf": "yes" },
  });
  expect(cleared.json()).toEqual({ module: "adapter", cleared: true });
  expect(
    (await server.inject({ method: "GET", url: logsUrl, headers: { "x-owner": "yes" } })).json(),
  ).toEqual({ module: "adapter", lines: [] });
  now = 2_001;
  expect(leases.levelFor("adapter", now)).toBe("info");
  await server.close();
});

it("rejects an invalid diagnostics allowlist", async () => {
  const server = Fastify();
  expect(() =>
    registerIsolatedDiagnosticsRoutes(server, {
      buffers: { "bad/module": new SafeLogBuffer("adapter") },
      leases: new DiagnosticLeases(),
      authorizeOwner: async () => true,
      verifyCsrf: async () => true,
    }),
  ).toThrow("Invalid diagnostics module allowlist");
  await server.close();
});

it("collects, retains and delivers only a bounded owner-authorized support bundle", async () => {
  const server = Fastify();
  let now = 10_000;
  const logs = new SafeLogBuffer("adapter", { now: () => now });
  logs.write(
    JSON.stringify({
      level: 20,
      time: now,
      module: "adapter",
      msg: "SCOPED_DIAGNOSTIC",
      code: "REQUEST_SUMMARY",
      req: { id: "01234567-89ab-4cde-8f01-23456789abcd", method: "GET" },
    }) + "\n",
  );
  registerIsolatedDiagnosticsRoutes(server, {
    buffers: { adapter: logs },
    leases: new DiagnosticLeases(),
    authorizeOwner: async (request) => request.headers["x-owner"] === "yes",
    verifyCsrf: async (request) => request.headers["x-csrf"] === "yes",
    now: () => now,
  });
  await server.ready();

  const path = "/api/grimmlink/v2/local/support-bundle";
  expect(
    (await server.inject({ method: "POST", url: path, headers: { "x-owner": "yes" } })).statusCode,
  ).toBe(403);
  const created = await server.inject({
    method: "POST",
    url: path,
    headers: { "x-owner": "yes", "x-csrf": "yes" },
  });
  expect(created.statusCode).toBe(200);
  expect(created.headers["cache-control"]).toBe("no-store");
  const receipt = created.json() as {
    bundleId: string;
    checksumSha256: string;
    expiresAt: string;
  };
  expect(receipt.bundleId).toMatch(/^[A-Za-z0-9_-]{22}$/);
  expect(receipt.checksumSha256).toMatch(/^[0-9a-f]{64}$/);

  expect(
    (
      await server.inject({
        method: "GET",
        url: `${path}/${receipt.bundleId}`,
      })
    ).statusCode,
  ).toBe(403);
  const delivered = await server.inject({
    method: "GET",
    url: `${path}/${receipt.bundleId}`,
    headers: { "x-owner": "yes" },
  });
  expect(delivered.statusCode).toBe(200);
  expect(delivered.headers["content-disposition"]).toBe(
    'attachment; filename="grimmlink-support-bundle.json"',
  );
  const bundle = delivered.json();
  expect(bundle.schema).toBe("grimmlink.phase08.support-bundle.v1");
  expect(bundle.checksum.value).toBe(receipt.checksumSha256);
  expect(bundle.report.diagnostics).toHaveLength(1);
  expect(bundle.report.diagnostics[0]).not.toContain("token");
  expect(createHash("sha256").update(JSON.stringify(bundle.report), "utf8").digest("hex")).toBe(
    receipt.checksumSha256,
  );

  now += 60 * 60_000;
  expect(
    (
      await server.inject({
        method: "GET",
        url: `${path}/${receipt.bundleId}`,
        headers: { "x-owner": "yes" },
      })
    ).statusCode,
  ).toBe(404);
  await server.close();
});
