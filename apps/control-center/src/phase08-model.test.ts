import { describe, expect, it } from "vitest";
import {
  createSafeSupportBundle,
  DISCONNECTED,
  parseLocalSnapshot,
  safeDiagnosticExport,
  supportBundleExpired,
  SUPPORT_BUNDLE_TTL_MS,
} from "./phase08-model.js";

const health = { status: "foundation-only", upstreamConnected: false };
const caps = {
  officialConnected: false,
  gatewayForwarding: "DENY_ALL",
  personalBridge: "OFF",
  nativeKosyncProgress: "OFF",
};
const version = {
  adapterVersion: "0.1.0",
  phase: "02",
  mode: "MOCK_ONLY",
  officialConnected: false,
  releaseAuthorization: "NOT_AUTHORIZED",
};

describe("Phase08 local diagnostics", () => {
  it("accepts only truthful mock adapter contracts, never interprets as Official connectivity", () => {
    const snapshot = parseLocalSnapshot(health, caps, version);
    expect(snapshot.observed).toBe(true);
    expect(snapshot.adapter).toBe("MOCK_ONLY");
    expect(snapshot.official).toBe("DISCONNECTED");
    expect(snapshot.gateway).toBe("DENY_ALL");
  });

  it("fails closed if any contract attempts to claim live Official access", () => {
    expect(parseLocalSnapshot(health, { ...caps, officialConnected: true }, version)).toEqual(
      DISCONNECTED,
    );
    expect(parseLocalSnapshot(health, { ...caps, gatewayForwarding: "ALLOW" }, version)).toEqual(
      DISCONNECTED,
    );
    expect(parseLocalSnapshot(health, caps, { ...version, mode: "LIVE" })).toEqual(DISCONNECTED);
    expect(parseLocalSnapshot({}, caps, version)).toEqual(DISCONNECTED);
    expect(parseLocalSnapshot(health, caps, { ...version, adapterVersion: "x\nsecret" })).toEqual(
      DISCONNECTED,
    );
  });

  it("exports an explicit allowlist, never foreign fields or credentials", () => {
    const snapshot = parseLocalSnapshot(
      { ...health, bearer: "SECRET_HEALTH" },
      { ...caps, apiKey: "SECRET_CAPS" },
      { ...version, token: "SECRET_VERSION" },
    );
    const diagnostic = safeDiagnosticExport(snapshot);
    expect(diagnostic).not.toContain("SECRET_");
    expect(diagnostic).not.toContain("token");
    expect(diagnostic).toContain('"phase09Required": true');
    expect(diagnostic).toContain('"release": "NOT_AUTHORIZED"');
  });

  it("creates an allow-listed checksummed bundle with a one-hour in-memory expiry", async () => {
    const snapshot = parseLocalSnapshot(
      { ...health, bearer: "SECRET_HEALTH" },
      { ...caps, apiKey: "SECRET_CAPS" },
      { ...version, token: "SECRET_VERSION" },
    );
    const bundle = await createSafeSupportBundle(snapshot, 1_800_000_000_000);
    const value = JSON.parse(bundle.text) as {
      schema: string;
      createdAt: string;
      expiresAt: string;
      checksum: { algorithm: string; covers: string; value: string };
      report: Record<string, unknown>;
    };
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(value.report)),
    );
    const expected = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    expect(value.schema).toBe("grimmlink.phase08.support-bundle.v1");
    expect(value.checksum).toEqual({
      algorithm: "SHA-256",
      covers: "report-json-v1",
      value: expected,
    });
    expect(bundle.checksumSha256).toBe(expected);
    expect(Date.parse(value.expiresAt) - Date.parse(value.createdAt)).toBe(SUPPORT_BUNDLE_TTL_MS);
    expect(supportBundleExpired(bundle, bundle.expiresAtMs - 1)).toBe(false);
    expect(supportBundleExpired(bundle, bundle.expiresAtMs)).toBe(true);
    expect(bundle.text).not.toContain("SECRET_");
    expect(value.report).toHaveProperty("phase09Required", true);
  });

  it("rejects invalid bundle clocks and treats an invalid current time as expired", async () => {
    await expect(createSafeSupportBundle(DISCONNECTED, Number.NaN)).rejects.toThrow(
      "SUPPORT_BUNDLE_CLOCK_INVALID",
    );
    const bundle = await createSafeSupportBundle(DISCONNECTED, 1_800_000_000_000);
    expect(supportBundleExpired(bundle, Number.NaN)).toBe(true);
  });
});
