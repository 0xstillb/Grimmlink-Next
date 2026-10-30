import { describe, expect, it } from "vitest";
import { classifyGatewayRequest } from "./route-policy.js";

const classify = (
  method: string,
  target: string,
  headers: Record<string, string | string[] | undefined> = {},
) => classifyGatewayRequest(method, target, headers);

describe("Phase02 zero-forward gateway classifier", () => {
  it.each([
    "/health",
    "/openapi.json",
    "/api/grimmlink/v2/capabilities",
    "/api/grimmlink/v2/version",
  ])(
    "permits local GET only: %s",
    (path) => {
      expect(classify("GET", path)).toBe("LOCAL_READ");
      expect(classify("HEAD", path)).toBe("DENY_UPSTREAM");
      expect(classify("POST", path)).toBe("DENY_UPSTREAM");
      expect(classify("OPTIONS", path)).toBe("DENY_UPSTREAM");
    },
  );

  it.each([
    "/",
    "/api/v1/books",
    "/api/v1/opds",
    "/opds",
    "/ws",
    "/api/koreader/users/create",
    "/api/koreader/syncs/progress",
    "/api/v1/books/reset-progress",
    "/grimmlink",
    "/api/grimmlink/v2/unknown",
  ])("never forwards Official or unreviewed route %s", (path) => {
    for (const method of ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      expect(classify(method, path)).toBe("DENY_UPSTREAM");
    }
  });

  it.each([
    "//health",
    "/health/",
    "/api//v1/books",
    "/api/../health",
    "/api/./health",
    "/%2fhealth",
    "/api/%2e%2e/health",
    "/api/%5cadmin",
    "/api\\v1\\books",
    "/health?debug=true",
    "/health#fragment",
    "/api;v=1/books",
    "http://example.test/health",
    "",
  ])("rejects ambiguous or non-origin target %s", (target) => {
    expect(classify("GET", target)).toBe("INVALID_TARGET");
  });

  it.each([
    "forwarded",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-prefix",
    "x-forwarded-uri",
    "x-original-url",
    "x-rewrite-url",
    "x-http-method-override",
  ])("rejects untrusted rewrite header %s", (key) => {
    expect(classify("GET", "/health", { [key]: "http://evil.test" })).toBe("INVALID_TARGET");
  });

  it.each([
    ["upgrade", "websocket"],
    ["sec-websocket-key", "synthetic-websocket-key"],
    ["range", "bytes=0-99"],
    ["if-range", "etag-canary"],
    ["proxy-authorization", "Basic canary"],
    ["transfer-encoding", "chunked"],
    ["accept", "text/event-stream"],
  ])("denies alternate protocol and content headers %s before local handling", (key, value) => {
    expect(classify("GET", "/health", { [key]: value })).toBe("INVALID_TARGET");
  });

  it("rejects host multiplicity and oversized path", () => {
    expect(classify("GET", "/health", { host: ["a", "b"] })).toBe("INVALID_TARGET");
    expect(classify("GET", "/health", { host: "a,b" })).toBe("INVALID_TARGET");
    expect(classify("GET", "/" + "a".repeat(4097))).toBe("INVALID_TARGET");
  });
});
