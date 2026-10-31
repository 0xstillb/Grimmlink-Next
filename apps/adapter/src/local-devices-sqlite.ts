import {
  initializeOfflineOwner,
  listOfflineReaders,
  pairOfflineReader,
  revokeOfflineReader,
  rotateOfflineReader,
  type LocalStore,
  type OfflineOwner,
} from "@grimmlink/persistence";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import type { LocalDevicesRouteSource } from "./local-devices-routes.js";

const authenticatedOwner: OfflineOwner = Object.freeze({
  kind: "authenticated-local-owner",
  accountId: "owner",
});

/** Bind local reader inventory to the configured one-owner session; never contacts a reader. */
export function createLocalDevicesRouteSource(
  store: LocalStore,
  ownerAuth: OwnerAuthenticator,
  now: () => number = Date.now,
): LocalDevicesRouteSource {
  initializeOfflineOwner(store.sqlite, authenticatedOwner);
  return Object.freeze({
    authorizeOwner: ownerAuth.authorizeOwner,
    verifyCsrf: ownerAuth.verifyCsrf,
    now,
    listDevices: () => listOfflineReaders(store.sqlite, authenticatedOwner),
    pairDevice: (deviceId, nowMs, expiresAtMs) => {
      const paired = pairOfflineReader(
        store.sqlite,
        authenticatedOwner,
        deviceId,
        nowMs,
        expiresAtMs,
      );
      const row = listOfflineReaders(store.sqlite, authenticatedOwner).find(
        (device) => device.deviceId === deviceId,
      );
      if (!row) throw new Error("LOCAL_DEVICE_PAIR_READBACK_FAILED");
      return { ...paired, generation: row.generation };
    },
    revokeDevice: (deviceId, nowMs) =>
      revokeOfflineReader(store.sqlite, authenticatedOwner, deviceId, nowMs),
    rotateDevice: (deviceId, nowMs, expiresAtMs) =>
      rotateOfflineReader(store.sqlite, authenticatedOwner, deviceId, nowMs, expiresAtMs),
  });
}
