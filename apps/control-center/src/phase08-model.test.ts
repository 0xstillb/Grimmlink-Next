import { describe, expect, it } from "vitest";
import { DISCONNECTED, parseLocalSnapshot, safeDiagnosticExport } from "./phase08-model.js";

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
    expect(
      parseLocalSnapshot(health, { ...caps, gatewayForwarding: "ALLOW" }, version),
    ).toEqual(DISCONNECTED);
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
});
