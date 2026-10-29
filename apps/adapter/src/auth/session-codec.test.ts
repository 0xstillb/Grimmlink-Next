import { describe, expect, it } from "vitest";
import { authorizeAdminMutation, authorizeReaderResource } from "./policy.js";
import { createIsolatedSessionCodec } from "./session-codec.js";

const key = Buffer.alloc(32, 77);
const otherKey = Buffer.alloc(32, 88);
const now = 100000;
const csrf = "SYNTHETIC_CSRF_123456789012345678901234567890";

describe("isolated sealed session codec, not a login or pairing endpoint", () => {
  it("issues and verifies a distinct admin session usable only with bound CSRF", () => {
    const codec = createIsolatedSessionCodec(key);
    const session = codec.verify(codec.issueAdmin("admin", csrf, now), now);
    expect(session?.kind).toBe("admin");
    expect(
      authorizeAdminMutation(session, {
        method: "POST",
        origin: "http://127.0.0.1:6060",
        expectedOrigin: "http://127.0.0.1:6060",
        csrfHeader: csrf,
        nowMs: now,
      }),
    ).toBe("ALLOW");
    expect(authorizeReaderResource(session, "admin", now)).toBe("ROLE_DENIED");
  });

  it("reader device token grants only its own synthetic account, never Admin", () => {
    const codec = createIsolatedSessionCodec(key);
    const session = codec.verify(codec.issueReader("reader1", "device1", now), now);
    expect(authorizeReaderResource(session, "reader1", now)).toBe("ALLOW");
    expect(authorizeReaderResource(session, "reader2", now)).toBe("OWNER_DENIED");
    expect(
      authorizeAdminMutation(session, {
        method: "POST",
        origin: "http://127.0.0.1:6060",
        expectedOrigin: "http://127.0.0.1:6060",
        csrfHeader: csrf,
        nowMs: now,
      }),
    ).toBe("ROLE_DENIED");
  });

  it("rejects tampered signature, rotated keys and expired tokens without fallback", () => {
    const codec = createIsolatedSessionCodec(key);
    const token = codec.issueAdmin("admin", csrf, now, 500);
    expect(codec.verify(token, now + 500)).toBeNull();
    expect(codec.verify(token, now - 1)).toBeNull();
    expect(createIsolatedSessionCodec(otherKey).verify(token, now)).toBeNull();
    const parts = token.split(".");
    const tampered = parts[0] + "." + parts[1]!.slice(0, -2) + "XX";
    expect(codec.verify(tampered, now)).toBeNull();
    expect(codec.verify(token + ".extra", now)).toBeNull();
  });

  it("requires a strong session key, safe identity and bounded lifetime", () => {
    expect(() => createIsolatedSessionCodec(Buffer.alloc(10))).toThrow("SESSION_KEY_INVALID");
    const codec = createIsolatedSessionCodec(key);
    expect(() => codec.issueAdmin("../admin", csrf, now)).toThrow("SESSION_ISSUE_INVALID");
    expect(() => codec.issueAdmin("admin", "short", now)).toThrow("SESSION_ISSUE_INVALID");
    expect(() => codec.issueReader("reader", "../device", now)).toThrow("SESSION_ISSUE_INVALID");
    expect(() => codec.issueReader("reader", "device", now, 86400000)).toThrow(
      "SESSION_ISSUE_INVALID",
    );
    expect(codec.verify({ authorization: "unsafe" }, now)).toBeNull();
    expect(codec.verify("a".repeat(100000), now)).toBeNull();
  });

  it("uses unpredictable per-session nonces and never contains raw CSRF", () => {
    const codec = createIsolatedSessionCodec(key);
    const first = codec.issueAdmin("admin", csrf, now);
    const second = codec.issueAdmin("admin", csrf, now);
    expect(first).not.toBe(second);
    const body = Buffer.from(first.split(".")[0]!, "base64url").toString("utf8");
    expect(body).not.toContain(csrf);
    expect(body).not.toContain("passwordMD5");
  });
});
