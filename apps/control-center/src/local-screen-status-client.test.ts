import { afterEach, expect, it, vi } from "vitest";
import { fetchLocalScreenStatus } from "./local-screen-status-client.js";

const status = {
  source: "NO_DOMAIN_PROVIDER_CONFIGURED",
  identity: { status: "UNAVAILABLE", reason: "TRUSTED_IDENTITY_PROVIDER_NOT_CONFIGURED" },
  reading: { status: "UNAVAILABLE", reason: "READER_READBACK_PROVIDER_NOT_CONFIGURED" },
  opds: { status: "UNAVAILABLE", reason: "CATALOG_PROVIDER_NOT_CONFIGURED" },
};

afterEach(() => vi.unstubAllGlobals());

it("fetches only the same-origin authenticated unavailable-state route", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(status), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchLocalScreenStatus()).toEqual(status);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/grimmlink/v2/local/screens/status",
    expect.objectContaining({
      method: "GET",
      credentials: "same-origin",
      mode: "same-origin",
      redirect: "error",
      cache: "no-store",
    }),
  );
});

it("rejects any response that invents a source or marks a domain available", async () => {
  const invalid = [
    { ...status, source: "MOCK_PROVIDER" },
    { ...status, reading: { status: "AVAILABLE", reason: "POSITION_FOUND" } },
    { ...status, opds: { ...status.opds, extra: "ignored" } },
  ];
  for (const value of invalid) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(value), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    await expect(fetchLocalScreenStatus()).rejects.toThrow("LOCAL_SCREEN_STATUS_INVALID");
  }
});
