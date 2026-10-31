import {
  initializeOfflineOwner,
  listOfflineIdentityRegistrations,
  type LocalStore,
  type OfflineOwner,
} from "@grimmlink/persistence";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import type { LocalIdentityRouteSource } from "./local-identity-routes.js";

const authenticatedOwner: OfflineOwner = Object.freeze({
  kind: "authenticated-local-owner",
  accountId: "owner",
});

/** Local registration readback only; no Official entitlement is inferred. */
export function createLocalIdentityRouteSource(
  store: LocalStore,
  ownerAuth: OwnerAuthenticator,
): LocalIdentityRouteSource {
  initializeOfflineOwner(store.sqlite, authenticatedOwner);
  return Object.freeze({
    authorizeOwner: ownerAuth.authorizeOwner,
    listIdentities: () => listOfflineIdentityRegistrations(store.sqlite, authenticatedOwner),
  });
}
