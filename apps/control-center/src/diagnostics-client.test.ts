import { afterEach, expect, it, vi } from "vitest";
import {
  DiagnosticsClientError,
  createServerSupportBundle,
  enableDiagnosticLease,
  fetchOwnerSession,
  fetchUpdateFeedSnapshot,
  fetchUpdateFeedSources,
  fetchDiagnosticLogs,
  fetchServerSupportBundle,
  loginOwner,
  logoutOwner,
  parseSafeDiagnosticLog,
} from "./diagnostics-client.js";

afterEach(() => vi.unstubAllGlobals());

const safeLine = JSON.stringify({
  level: 20,
  time: 1_800_000_000_000,
  module: "adapter",
  msg: "SCOPED_DIAGNOSTIC",
  code: "REQUEST_SUMMARY",
  req: { id: "01234567-89ab-4cde-8f01-23456789abcd", method: "GET" },
});

it("accepts only scoped redacted diagnostic log lines and drops presentation-unneeded fields", () => {
  expect(parseSafeDiagnosticLog(safeLine)).toEqual({
    level: 20,
    time: 1_800_000_000_000,
    code: "REQUEST_SUMMARY",
    request: { id: "01234567-89ab-4cde-8f01-23456789abcd", method: "GET" },
  });
  expect(() =>
    parseSafeDiagnosticLog(
      JSON.stringify({
        ...JSON.parse(safeLine),
        req: { id: "01234567-89ab-4cde-8f01-23456789abcd", method: "GET", url: "/private" },
      }),
    ),
  ).toThrow("DIAGNOSTIC_LINE_INVALID");
  expect(() =>
    parseSafeDiagnosticLog(JSON.stringify({ ...JSON.parse(safeLine), message: "token=secret" })),
  ).toThrow("DIAGNOSTIC_LINE_INVALID");
});

it("uses same-origin bounded GETs and sends only validated allow-listed filters", async () => {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ module: "adapter", lines: [safeLine] }), {
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const logs = await fetchDiagnosticLogs({
    level: "debug",
    code: "REQUEST_SUMMARY",
    requestId: "01234567-89ab-4cde-8f01-23456789abcd",
    limit: 25,
  });
  expect(logs).toHaveLength(1);
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe(
    "/api/grimmlink/v2/local/diagnostics/adapter/logs?level=debug&code=REQUEST_SUMMARY&requestId=01234567-89ab-4cde-8f01-23456789abcd&limit=25",
  );
  expect(init).toMatchObject({
    method: "GET",
    credentials: "same-origin",
    mode: "same-origin",
    redirect: "error",
    cache: "no-store",
  });
  expect(init?.headers).toEqual({ Accept: "application/json" });
  await expect(fetchDiagnosticLogs({ requestId: "invalid" })).rejects.toThrow(
    "DIAGNOSTICS_FILTER_INVALID",
  );
});

it("enables only bounded leases with a validated CSRF token and hides authorization response bodies", async () => {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PUT") {
      return new Response(
        JSON.stringify({ module: "adapter", level: "debug", expiresAt: 1_800_001_800_000 }),
        { headers: { "content-type": "application/json" } },
      );
    }
    return new Response("secret token leaked by server", { status: 403 });
  });
  vi.stubGlobal("fetch", fetchMock);
  await expect(enableDiagnosticLease("debug", "too-short")).rejects.toThrow(
    "DIAGNOSTICS_CSRF_TOKEN_INVALID",
  );
  expect(fetchMock).not.toHaveBeenCalled();
  const lease = await enableDiagnosticLease("debug", "A".repeat(32));
  expect(lease).toEqual({ level: "debug", expiresAt: 1_800_001_800_000 });
  const init = fetchMock.mock.calls[0]?.[1];
  expect(init?.method).toBe("PUT");
  expect(init?.headers).toEqual({
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-csrf-token": "A".repeat(32),
  });
  expect(JSON.parse(String(init?.body))).toEqual({ level: "debug", durationMs: 30 * 60_000 });
  try {
    await fetchDiagnosticLogs();
    throw new Error("EXPECTED_FORBIDDEN");
  } catch (error) {
    expect(error).toBeInstanceOf(DiagnosticsClientError);
    expect((error as Error).message).toBe("DIAGNOSTICS_REQUEST_FAILED");
    expect((error as Error).message).not.toContain("secret");
  }
});

it("uses same-origin owner session, login and logout contracts with bounded responses", async () => {
  const csrfToken = "A".repeat(43);
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: true, csrfToken }), {
        headers: { "content-type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ authenticated: true, csrfToken, expiresAtMs: 1_800_000_000_000 }),
        {
          headers: { "content-type": "application/json" },
        },
      ),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);

  expect(await fetchOwnerSession()).toEqual({ authenticated: true, csrfToken });
  expect(await loginOwner("secure owner password")).toEqual({
    csrfToken,
    expiresAtMs: 1_800_000_000_000,
  });
  await logoutOwner(csrfToken);

  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/grimmlink/v2/local/auth/session",
    "/api/grimmlink/v2/local/auth/login",
    "/api/grimmlink/v2/local/auth/logout",
  ]);
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    method: "GET",
    credentials: "same-origin",
    mode: "same-origin",
    cache: "no-store",
  });
  expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    mode: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ password: "secure owner password" }),
  });
  expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
    method: "POST",
    credentials: "same-origin",
    mode: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json", "x-csrf-token": csrfToken },
  });
});

it("loads owner-only update sources and validates unverified release evidence", async () => {
  const snapshot = {
    sourceId: "grimmlink-next",
    fetchedAt: "2026-10-31T00:00:00.000Z",
    release: {
      tag: "v0.1.0",
      title: "Grimmlink Next 0.1.0",
      publishedAt: "2026-10-30T12:00:00.000Z",
      url: "https://github.com/0xstillb/Grimmlink-Next/releases/tag/v0.1.0",
      assets: [{ name: "grimmlink-next.zip", size: 1024, sha256: "a".repeat(64) }],
    },
    advisories: [
      {
        id: "GHSA-abcd-1234-efgh",
        summary: "Fixture advisory",
        severity: "unknown",
        packages: [
          {
            ecosystem: "npm",
            name: "fixture-package",
            vulnerableRange: "< 1.0.1",
            patchedVersions: "1.0.1",
          },
        ],
      },
    ],
    sourceEvidence: "PUBLIC_GITHUB_PAYLOAD_UNVERIFIED",
    compatibility: "UNKNOWN_REQUIRES_REVIEW",
    impact: "UNCLASSIFIED_REQUIRES_REVIEW",
    approval: "NOT_AUTHORIZED",
    installationAllowed: false,
  } as const;
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ sourceIds: ["grimmlink-next"] }), {
        headers: { "content-type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ snapshot }), {
        headers: { "content-type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ snapshot: { ...snapshot, installationAllowed: true } }), {
        headers: { "content-type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", fetchMock);

  expect(await fetchUpdateFeedSources()).toEqual(["grimmlink-next"]);
  expect(await fetchUpdateFeedSnapshot("grimmlink-next")).toEqual(snapshot);
  await expect(fetchUpdateFeedSnapshot("grimmlink-next")).rejects.toThrow(
    "UPDATE_FEED_RESPONSE_INVALID",
  );
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/grimmlink/v2/local/updates",
    "/api/grimmlink/v2/local/updates/grimmlink-next",
    "/api/grimmlink/v2/local/updates/grimmlink-next",
  ]);
  await expect(fetchUpdateFeedSnapshot("https://attacker.invalid")).rejects.toThrow(
    "UPDATE_FEED_SOURCE_INVALID",
  );
});

it("treats an expired or missing owner cookie as signed out and rejects malformed login data", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true, csrfToken: "bad" }), {
          headers: { "content-type": "application/json" },
        }),
      ),
  );
  expect(await fetchOwnerSession()).toEqual({ authenticated: false, csrfToken: null });
  await expect(loginOwner("secure owner password")).rejects.toThrow("OWNER_LOGIN_RESPONSE_INVALID");
});

it("creates and verifies a bounded server support bundle before download", async () => {
  const bundleId = "A".repeat(22);
  const createdAt = "2026-10-31T00:00:00.000Z";
  const expiresAt = "2026-10-31T01:00:00.000Z";
  const report = {
    schema: "grimmlink.phase08.support-report.v1",
    generatedAt: createdAt,
    scope: "SAFE_LOCAL_PROCESS_STATUS",
    status: {
      mode: "MOCK_ONLY",
      officialConnected: false,
      gatewayForwarding: "DENY_ALL",
      protectedWrites: "OFF",
    },
    diagnostics: [safeLine],
  };
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(report)),
  );
  const checksumSha256 = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const bundle = {
    schema: "grimmlink.phase08.support-bundle.v1",
    createdAt,
    expiresAt,
    checksum: { algorithm: "SHA-256", covers: "report-json-v1", value: checksumSha256 },
    report,
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ bundleId, checksumSha256, expiresAt }), {
        headers: { "content-type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(bundle), { headers: { "content-type": "application/json" } }),
    );
  vi.stubGlobal("fetch", fetchMock);

  const receipt = await createServerSupportBundle("A".repeat(43));
  expect(receipt).toEqual({ bundleId, checksumSha256, expiresAt });
  const downloaded = await fetchServerSupportBundle(bundleId);
  expect(downloaded.report.diagnostics).toEqual([safeLine]);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/grimmlink/v2/local/support-bundle",
    `/api/grimmlink/v2/local/support-bundle/${bundleId}`,
  ]);
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    method: "POST",
    headers: { Accept: "application/json", "x-csrf-token": "A".repeat(43) },
  });
  await expect(fetchServerSupportBundle("short-id")).rejects.toThrow("SUPPORT_BUNDLE_ID_INVALID");
});

it("rejects support bundle checksum changes before making them available for download", async () => {
  const report = {
    schema: "grimmlink.phase08.support-report.v1",
    generatedAt: "2026-10-31T00:00:00.000Z",
    scope: "SAFE_LOCAL_PROCESS_STATUS",
    status: {
      mode: "MOCK_ONLY",
      officialConnected: false,
      gatewayForwarding: "DENY_ALL",
      protectedWrites: "OFF",
    },
    diagnostics: [safeLine],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          schema: "grimmlink.phase08.support-bundle.v1",
          createdAt: report.generatedAt,
          expiresAt: "2026-10-31T01:00:00.000Z",
          checksum: { algorithm: "SHA-256", covers: "report-json-v1", value: "0".repeat(64) },
          report,
        }),
        { headers: { "content-type": "application/json" } },
      ),
    ),
  );
  await expect(fetchServerSupportBundle("A".repeat(22))).rejects.toThrow(
    "SUPPORT_BUNDLE_CHECKSUM_INVALID",
  );
});
