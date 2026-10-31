import { describe, expect, it } from "vitest";
import { scryptSync } from "node:crypto";
import { createOwnerAuthenticator } from "./auth/owner-auth.js";
import { buildServer, getAdapterDiagnostics } from "./server.js";

const OWNER_PASSWORD = "server-test-owner-password";
const OWNER_SALT = Buffer.from("server-auth-test");
const OWNER_HASH = `scrypt$32768$8$1$${OWNER_SALT.toString("base64url")}$${scryptSync(
  OWNER_PASSWORD,
  OWNER_SALT,
  32,
  { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
).toString("base64url")}`;

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
    const diagnosticsRoute = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/diagnostics/adapter/logs",
    });
    expect(diagnosticsRoute.statusCode).toBe(404);
    const ownerSessionRoute = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/auth/session",
    });
    expect(ownerSessionRoute.statusCode).toBe(404);
    const ownerOpfRoute = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/opf/preview",
      payload: { opfXml: "<package><metadata/></package>" },
    });
    expect(ownerOpfRoute.statusCode).toBe(404);
    const ownerSidecarRoute = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/sidecar/preview",
      payload: { sidecarJson: '{"title":"not mounted"}' },
    });
    expect(ownerSidecarRoute.statusCode).toBe(404);
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

  it("mounts owner login and diagnostics together only when explicitly configured", async () => {
    const ownerAuth = createOwnerAuthenticator({
      passwordHash: OWNER_HASH,
      sessionSigningKey: Buffer.alloc(32, 0x61),
      publicOrigin: "http://127.0.0.1:5173",
    });
    const server = await buildServer("info", { ownerAuth });
    const prefix = "/api/grimmlink/v2/local/auth";
    const anonymous = await server.inject({ method: "GET", url: `${prefix}/session` });
    expect(anonymous.statusCode).toBe(401);

    const login = await server.inject({
      method: "POST",
      url: `${prefix}/login`,
      headers: { origin: "http://127.0.0.1:5173", "content-type": "application/json" },
      payload: { password: OWNER_PASSWORD },
    });
    expect(login.statusCode).toBe(200);
    const setCookie = login.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.split(";", 1)[0]!)
      .join("; ");
    const logs = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/diagnostics/adapter/logs",
      headers: { cookie },
    });
    expect(logs.statusCode).toBe(200);
    expect(logs.json()).toMatchObject({ module: "adapter", lines: [] });
    const csrfToken = login.json<{ csrfToken: string }>().csrfToken;
    const opfPreview = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/opf/preview",
      headers: {
        cookie,
        origin: "http://127.0.0.1:5173",
        "x-csrf-token": csrfToken,
      },
      payload: {
        opfXml:
          '<package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>Owner preview</dc:title></metadata></package>',
      },
    });
    expect(opfPreview.statusCode).toBe(200);
    expect(opfPreview.json()).toMatchObject({
      metadata: { title: "Owner preview" },
      action: "DRY_RUN_ONLY",
      writesAllowed: false,
      source: "OWNER_SELECTED_OPF",
    });
    const sidecarPreview = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/sidecar/preview",
      headers: {
        cookie,
        origin: "http://127.0.0.1:5173",
        "x-csrf-token": csrfToken,
      },
      payload: { sidecarJson: '{"metadata":{"title":"Sidecar preview","seriesNumber":2.5}}' },
    });
    expect(sidecarPreview.statusCode).toBe(200);
    expect(sidecarPreview.json()).toEqual({
      metadata: { title: "Sidecar preview", seriesNumber: 2.5 },
      action: "PREVIEW_ONLY",
      writesAllowed: false,
      source: "OWNER_SELECTED_SIDECAR",
      importsEnabled: false,
      adjacentWriteEnabled: false,
    });
    const settings = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/settings/status",
      headers: { cookie },
    });
    expect(settings.statusCode).toBe(200);
    expect(settings.json()).toMatchObject({
      source: "CODE_ENFORCED_FAIL_CLOSED_POLICY",
      officialForwarding: "DENY_ALL",
      protectedWrites: "OFF",
      automaticUpdates: "OFF",
      production: "NOT_AUTHORIZED",
    });
    const openapi = await server.inject({ method: "GET", url: "/openapi.json" });
    expect(
      openapi.json().paths["/api/grimmlink/v2/local/opf/preview"].post.responses["200"],
    ).toBeDefined();
    expect(
      openapi.json().paths["/api/grimmlink/v2/local/sidecar/preview"].post.responses["200"],
    ).toBeDefined();
    expect(
      openapi.json().paths["/api/grimmlink/v2/local/settings/status"].get.responses["200"],
    ).toBeDefined();
    const anonymousOpf = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/opf/preview",
      payload: { opfXml: "<package><metadata/></package>" },
    });
    expect(anonymousOpf.statusCode).toBe(403);
    expect(anonymousOpf.json()).toEqual({ error: "OWNER_AUTH_REQUIRED" });
    const anonymousSidecar = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/sidecar/preview",
      payload: { sidecarJson: '{"title":"anonymous"}' },
    });
    expect(anonymousSidecar.statusCode).toBe(403);
    expect(anonymousSidecar.json()).toEqual({ error: "OWNER_AUTH_REQUIRED" });
    const anonymousSettings = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/settings/status",
    });
    expect(anonymousSettings.statusCode).toBe(403);
    expect(anonymousSettings.json()).toEqual({ error: "OWNER_AUTH_REQUIRED" });
    await server.close();
  });

  it("documents and mounts only the owner-gated local jobs API", async () => {
    const ownerAuth = createOwnerAuthenticator({
      passwordHash: OWNER_HASH,
      sessionSigningKey: Buffer.alloc(32, 0x63),
      publicOrigin: "http://127.0.0.1:5173",
    });
    const server = await buildServer("info", {
      ownerAuth,
      localJobs: {
        authorizeOwner: async (request) => request.headers["x-test-owner"] === "yes",
        verifyCsrf: async (request) => request.headers["x-test-csrf"] === "yes",
        listJobs: () => [],
        replayEvents: () => [],
        controlJob: () => ({ status: "APPLIED" }),
      },
    });

    const docs = await server.inject({ method: "GET", url: "/openapi.json" });
    expect(docs.json().paths["/api/grimmlink/v2/local/jobs"].get.responses["200"]).toBeDefined();
    expect(
      docs.json().paths["/api/grimmlink/v2/local/jobs/events"].get.responses["200"].content[
        "text/event-stream"
      ],
    ).toBeDefined();
    expect(
      docs.json().paths["/api/grimmlink/v2/local/jobs/{id}/control"].post.requestBody,
    ).toBeDefined();

    const anonymous = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/jobs",
    });
    expect(anonymous.statusCode).toBe(403);
    const owner = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/jobs",
      headers: { "x-test-owner": "yes" },
    });
    expect(owner.statusCode).toBe(200);
    expect(owner.json()).toMatchObject({
      jobs: [],
      execution: "DISABLED_NO_WORKER",
      officialWrites: "OFF",
    });
    const stream = await server.inject({
      method: "GET",
      url: "/api/grimmlink/v2/local/jobs/events",
      headers: { "x-test-owner": "yes", accept: "text/event-stream" },
    });
    expect(stream.statusCode).toBe(200);
    expect(stream.headers["content-type"]).toContain("text/event-stream");
    await server.close();
  });

  it("mounts configured update feeds only behind the local owner session", async () => {
    const ownerAuth = createOwnerAuthenticator({
      passwordHash: OWNER_HASH,
      sessionSigningKey: Buffer.alloc(32, 0x62),
      publicOrigin: "http://127.0.0.1:5173",
    });
    const updateFeed = {
      sourceIds: ["grimmory"],
      read: async () => ({
        sourceId: "grimmory",
        fetchedAt: "2026-10-31T00:00:00.000Z",
        release: {
          tag: "v3.5.1",
          title: "Grimmory 3.5.1",
          publishedAt: "2026-10-30T12:00:00.000Z",
          url: "https://github.com/grimmory-tools/grimmory/releases/tag/v3.5.1",
          assets: [],
        },
        advisories: [],
        sourceEvidence: "PUBLIC_GITHUB_PAYLOAD_UNVERIFIED",
        compatibility: "UNKNOWN_REQUIRES_REVIEW",
        impact: "UNCLASSIFIED_REQUIRES_REVIEW",
        approval: "NOT_AUTHORIZED",
        installationAllowed: false,
      }),
    } as const;
    await expect(buildServer("info", { updateFeed })).rejects.toThrow(
      "An update feed requires the configured local owner authenticator",
    );
    const server = await buildServer("info", { ownerAuth, updateFeed });
    const sourcesUrl = "/api/grimmlink/v2/local/updates";
    const anonymous = await server.inject({ method: "GET", url: sourcesUrl });
    expect(anonymous.statusCode).toBe(403);

    const login = await server.inject({
      method: "POST",
      url: "/api/grimmlink/v2/local/auth/login",
      headers: { origin: "http://127.0.0.1:5173", "content-type": "application/json" },
      payload: { password: OWNER_PASSWORD },
    });
    const setCookie = login.headers["set-cookie"];
    const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.split(";", 1)[0]!)
      .join("; ");
    const sources = await server.inject({ method: "GET", url: sourcesUrl, headers: { cookie } });
    expect(sources.statusCode).toBe(200);
    expect(sources.json()).toEqual({ sourceIds: ["grimmory"] });
    const snapshot = await server.inject({
      method: "GET",
      url: `${sourcesUrl}/grimmory`,
      headers: { cookie },
    });
    expect(snapshot.statusCode).toBe(200);
    expect(snapshot.json().snapshot).toMatchObject({
      compatibility: "UNKNOWN_REQUIRES_REVIEW",
      impact: "UNCLASSIFIED_REQUIRES_REVIEW",
      approval: "NOT_AUTHORIZED",
      installationAllowed: false,
    });
    await server.close();
  });

  it("composes the diagnostics routes only with explicit owner and CSRF verifiers", async () => {
    const server = await buildServer("info", {
      diagnostics: {
        authorizeOwner: async (request) => request.headers["x-test-owner"] === "yes",
        verifyCsrf: async (request) => request.headers["x-test-csrf"] === "yes",
      },
    });
    const logsUrl = "/api/grimmlink/v2/local/diagnostics/adapter/logs";
    const leaseUrl = "/api/grimmlink/v2/local/diagnostics/adapter/lease";
    const anonymous = await server.inject({ method: "GET", url: logsUrl });
    expect(anonymous.statusCode).toBe(403);

    const deniedLease = await server.inject({
      method: "PUT",
      url: leaseUrl,
      headers: { "x-test-owner": "yes" },
      payload: { level: "debug", durationMs: 30_000 },
    });
    expect(deniedLease.statusCode).toBe(403);
    expect(deniedLease.json()).toEqual({ error: "CSRF_REQUIRED" });

    const enabledLease = await server.inject({
      method: "PUT",
      url: leaseUrl,
      headers: { "x-test-owner": "yes", "x-test-csrf": "yes" },
      payload: { level: "debug", durationMs: 30_000 },
    });
    expect(enabledLease.statusCode).toBe(200);
    const health = await server.inject({ method: "GET", url: "/health" });
    const response = await server.inject({
      method: "GET",
      url: `${logsUrl}?requestId=${health.headers["x-correlation-id"]}`,
      headers: { "x-test-owner": "yes" },
    });
    expect(response.statusCode).toBe(200);
    const line = response.json().lines[0];
    expect(JSON.parse(line).req).toEqual({ id: health.headers["x-correlation-id"], method: "GET" });
    expect(line).not.toContain("private");
    expect(line).not.toContain("/health");

    const deniedClear = await server.inject({
      method: "DELETE",
      url: logsUrl,
      headers: { "x-test-owner": "yes" },
    });
    expect(deniedClear.statusCode).toBe(403);
    const disabledLease = await server.inject({
      method: "DELETE",
      url: leaseUrl,
      headers: { "x-test-owner": "yes", "x-test-csrf": "yes" },
    });
    expect(disabledLease.statusCode).toBe(200);
    const cleared = await server.inject({
      method: "DELETE",
      url: logsUrl,
      headers: { "x-test-owner": "yes", "x-test-csrf": "yes" },
    });
    expect(cleared.statusCode).toBe(200);
    const empty = await server.inject({
      method: "GET",
      url: logsUrl,
      headers: { "x-test-owner": "yes" },
    });
    expect(empty.json().lines).toEqual([]);
    await server.close();
  });
});
