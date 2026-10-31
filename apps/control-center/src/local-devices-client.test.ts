import { afterEach, expect, it, vi } from "vitest";
import {
  createLocalDevicePairing,
  fetchLocalDevices,
  revokeLocalDevice,
  rotateLocalDevice,
} from "./local-devices-client.js";

afterEach(() => vi.unstubAllGlobals());

it("reads only the same-origin local device inventory and rejects token material in listings", async () => {
  const snapshot = {
    source: "LOCAL_SQLITE_OFFLINE",
    devices: [
      {
        deviceId: "reader-1",
        generation: 1,
        expiresAtMs: 100_000,
        revokedAtMs: null,
        state: "ACTIVE",
      },
    ],
    officialWrites: "OFF",
  };
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(snapshot), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  expect(await fetchLocalDevices()).toEqual(snapshot);
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/grimmlink/v2/local/devices",
    expect.objectContaining({
      method: "GET",
      credentials: "same-origin",
      mode: "same-origin",
      redirect: "error",
      cache: "no-store",
    }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...snapshot,
          devices: [{ ...snapshot.devices[0], token: "secret" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
  await expect(fetchLocalDevices()).rejects.toThrow("LOCAL_DEVICES_RESPONSE_INVALID");
});

it("sends CSRF on owner mutations and accepts empty revoke responses", async () => {
  const token = "A".repeat(43);
  const tokenResponse = {
    deviceId: "reader-1",
    token,
    generation: 2,
    expiresAtMs: 200_000,
    delivery: "OFFLINE_TOKEN_SHOWN_ONCE",
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify(tokenResponse), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify(tokenResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  expect(await createLocalDevicePairing("reader-1", 30, "C".repeat(32))).toEqual(tokenResponse);
  await expect(revokeLocalDevice("reader-1", "C".repeat(32))).resolves.toBeUndefined();
  expect(await rotateLocalDevice("reader-1", 30, "C".repeat(32))).toEqual(tokenResponse);
  expect(fetchMock).toHaveBeenNthCalledWith(
    1,
    "/api/grimmlink/v2/local/devices",
    expect.objectContaining({
      headers: expect.objectContaining({ "x-csrf-token": "C".repeat(32) }),
    }),
  );
  expect(fetchMock).toHaveBeenNthCalledWith(
    2,
    "/api/grimmlink/v2/local/devices/reader-1/revoke",
    expect.objectContaining({ method: "POST", body: "{}" }),
  );
});
