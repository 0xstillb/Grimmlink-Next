import { afterEach, expect, it, vi } from "vitest";
import {
  DiagnosticsClientError,
  enableDiagnosticLease,
  fetchDiagnosticLogs,
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
