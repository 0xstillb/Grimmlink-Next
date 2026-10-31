import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { authorizeAdminMutation, authorizeReaderResource, type VerifiedActor } from "./policy.js";

const csrf = "SYNTHETIC_CSRF_TOKEN_12345678901234567890";
const now = 1_000_000;
const admin: VerifiedActor = {
  kind: "admin",
  accountId: "admin_1",
  expiresAtMs: now + 60_000,
  csrfSha256: createHash("sha256").update(csrf).digest("hex"),
};
const reader: VerifiedActor = {
  kind: "reader",
  accountId: "reader_1",
  deviceId: "koreader_device_1",
  expiresAtMs: now + 60_000,
};
const mutation = {
  method: "POST",
  origin: "http://127.0.0.1:6060",
  expectedOrigin: "http://127.0.0.1:6060",
  csrfHeader: csrf,
  nowMs: now,
};

describe("admin Control Center mutation guard (pure contract)", () => {
  it("allows a verified, unexpired admin with server-bound CSRF and exact origin", () => {
    expect(authorizeAdminMutation(admin, mutation)).toBe("ALLOW");
    expect(
      authorizeAdminMutation(admin, {
        ...mutation,
        origin: "http://127.0.0.1:5173",
        expectedOrigin: "http://127.0.0.1:5173",
      }),
    ).toBe("ALLOW");
  });
  it("denies missing identity and refuses admin token use from a reader", () => {
    expect(authorizeAdminMutation(null, mutation)).toBe("UNAUTHENTICATED");
    expect(authorizeAdminMutation(reader, mutation)).toBe("ROLE_DENIED");
  });
  it("denies invalid or missing origin and CSRF, including proxy-origin confusion", () => {
    expect(authorizeAdminMutation(admin, { ...mutation, origin: undefined })).toBe("ORIGIN_DENIED");
    expect(authorizeAdminMutation(admin, { ...mutation, origin: "http://evil.invalid" })).toBe(
      "ORIGIN_DENIED",
    );
    expect(
      authorizeAdminMutation(admin, {
        ...mutation,
        csrfHeader: "INVALID_CSRF_TOKEN_12345678901234567890",
      }),
    ).toBe("CSRF_DENIED");
    expect(authorizeAdminMutation(admin, { ...mutation, csrfHeader: undefined })).toBe(
      "CSRF_DENIED",
    );
    expect(
      authorizeAdminMutation(admin, { ...mutation, expectedOrigin: "http://evil.invalid" }),
    ).toBe("INVALID_REQUEST");
  });
  it("denies GET mutations and expired or malformed sessions", () => {
    expect(authorizeAdminMutation(admin, { ...mutation, method: "GET" })).toBe("INVALID_REQUEST");
    expect(authorizeAdminMutation(admin, { ...mutation, nowMs: now + 60_000 })).toBe("EXPIRED");
    expect(authorizeAdminMutation({ ...admin, csrfSha256: "bad" }, mutation)).toBe("CSRF_DENIED");
  });
});

describe("reader current-owner isolation (pure contract)", () => {
  it("allows only the same authenticated reader account", () => {
    expect(authorizeReaderResource(reader, "reader_1", now)).toBe("ALLOW");
    expect(authorizeReaderResource(reader, "other_reader", now)).toBe("OWNER_DENIED");
  });
  it("never implicitly uses admin rights for personal content", () => {
    expect(authorizeReaderResource(admin, "admin_1", now)).toBe("ROLE_DENIED");
    expect(authorizeReaderResource(null, "reader_1", now)).toBe("UNAUTHENTICATED");
  });
  it("denies invalid book-owner binding, expired device or malformed identity", () => {
    expect(authorizeReaderResource(reader, "../reader_1", now)).toBe("INVALID_REQUEST");
    expect(authorizeReaderResource(reader, "reader_1", now + 60_000)).toBe("EXPIRED");
    expect(authorizeReaderResource({ ...reader, deviceId: "../other" }, "reader_1", now)).toBe(
      "INVALID_REQUEST",
    );
  });
});
