import {
  initializeOfflineOwner,
  listOwnerOfflineReading,
  type LocalStore,
  type OfflineOwner,
} from "@grimmlink/persistence";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import type { LocalReadingRouteSource } from "./local-reading-routes.js";

const authenticatedOwner: OfflineOwner = Object.freeze({
  kind: "authenticated-local-owner",
  accountId: "owner",
});

/** Read-only local Phase06 projection; never queries a reader or sends progress upstream. */
export function createLocalReadingRouteSource(
  store: LocalStore,
  ownerAuth: OwnerAuthenticator,
): LocalReadingRouteSource {
  initializeOfflineOwner(store.sqlite, authenticatedOwner);
  return Object.freeze({
    authorizeOwner: ownerAuth.authorizeOwner,
    listReading: () => listOwnerOfflineReading(store.sqlite, authenticatedOwner),
  });
}
