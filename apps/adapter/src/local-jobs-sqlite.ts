import {
  controlPendingPlan,
  getJobSnapshot,
  listDurableJobs,
  replayJobEvents,
  retryFailedPlan,
  type LocalStore,
} from "@grimmlink/persistence";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import type { LocalJobsRouteSource } from "./local-jobs-routes.js";

/** Bind the authenticated Control Center job API to the real local SQLite ledger. */
export function createLocalJobsRouteSource(
  store: LocalStore,
  ownerAuth: OwnerAuthenticator,
  now: () => number = Date.now,
): LocalJobsRouteSource {
  return Object.freeze({
    authorizeOwner: ownerAuth.authorizeOwner,
    verifyCsrf: ownerAuth.verifyCsrf,
    listJobs: () => listDurableJobs(store.sqlite, 100),
    replayEvents: (afterSeq, limit) => replayJobEvents(store.sqlite, afterSeq, limit),
    controlJob: (id, action) => {
      if (getJobSnapshot(store.sqlite, id) === null) return { status: "NOT_FOUND" };
      try {
        if (action === "RETRY") {
          return { status: "RETRY_SCHEDULED", dueAt: retryFailedPlan(store.sqlite, id, now()) };
        }
        controlPendingPlan(store.sqlite, id, now(), action);
        return { status: "APPLIED" };
      } catch {
        return { status: "CONFLICT" };
      }
    },
  });
}
