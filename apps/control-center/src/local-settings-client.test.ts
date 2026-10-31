import { afterEach, expect, it, vi } from "vitest";
import {
  fetchLocalDiagnosticsSettings,
  fetchLocalSecurityPolicy,
  updateLocalDiagnosticsSettings,
} from "./local-settings-client.js";

const diagnosticsSettings = {
  source: "OWNER_CONFIGURED_LOCAL_DIAGNOSTICS",
  maxEntries: 500,
  maxBytes: 1_048_576,
  retentionHours: 24,
  limits: { maxEntries: 10_000, maxBytes: 8_388_608, retentionHours: 24 },
};

const policy = {
  source: "CODE_ENFORCED_FAIL_CLOSED_POLICY",
  mode: "SINGLE_OWNER_PRIVATE",
  officialForwarding: "DENY_ALL",
  protectedWrites: "OFF",
  nativeKosync: "OFF",
  personalBridge: "OFF",
  sessionBridge: "OFF",
  resetProgress: "OFF",
  managedProjection: "OFF",
  automaticUpdates: "OFF",
  production: "NOT_AUTHORIZED",
};

afterEach(() => vi.unstubAllGlobals());

it("reads only the same-origin, authenticated local policy route", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(policy), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchLocalSecurityPolicy()).toEqual(policy);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/grimmlink/v2/local/settings/status",
    expect.objectContaining({
      method: "GET",
      credentials: "same-origin",
      mode: "same-origin",
      redirect: "error",
      cache: "no-store",
    }),
  );
});

it("rejects unknown fields and any policy that claims a protected feature is enabled", async () => {
  for (const body of [
    { ...policy, secret: "must-not-pass" },
    { ...policy, officialForwarding: "ALLOW" },
    { ...policy, production: "AUTHORIZED" },
  ]) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(fetchLocalSecurityPolicy()).rejects.toThrow("LOCAL_SETTINGS_RESPONSE_INVALID");
  }
});

it("reads bounded diagnostics settings from the owner-only same-origin endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(diagnosticsSettings), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchLocalDiagnosticsSettings()).toEqual(diagnosticsSettings);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/grimmlink/v2/local/settings/diagnostics",
    expect.objectContaining({
      method: "GET",
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
    }),
  );
});

it("updates diagnostics settings with CSRF and rejects values beyond hard limits", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ...diagnosticsSettings, maxEntries: 700 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  const input = { maxEntries: 700, maxBytes: 2_097_152, retentionHours: 6 };
  await updateLocalDiagnosticsSettings("a".repeat(43), input);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/grimmlink/v2/local/settings/diagnostics",
    expect.objectContaining({
      method: "PUT",
      credentials: "same-origin",
      headers: expect.objectContaining({ "x-csrf-token": "a".repeat(43) }),
      body: JSON.stringify(input),
    }),
  );
  await expect(
    updateLocalDiagnosticsSettings("a".repeat(43), { ...input, retentionHours: 25 }),
  ).rejects.toThrow("LOCAL_SETTINGS_INPUT_INVALID");
});

it("rejects unexpected diagnostics settings fields and modified hard limits", async () => {
  for (const value of [
    { ...diagnosticsSettings, extra: true },
    { ...diagnosticsSettings, limits: { ...diagnosticsSettings.limits, maxEntries: 50_000 } },
  ]) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(value), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(fetchLocalDiagnosticsSettings()).rejects.toThrow(
      "LOCAL_SETTINGS_RESPONSE_INVALID",
    );
  }
});
