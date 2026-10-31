import { afterEach, expect, it, vi } from "vitest";
import { fetchLocalSecurityPolicy } from "./local-settings-client.js";

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
