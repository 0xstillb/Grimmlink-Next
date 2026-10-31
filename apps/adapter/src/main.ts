import { validateEnvironment } from "@grimmlink/contracts";
import { buildServer } from "./server.js";
import { createOwnerAuthenticatorFromEnvironment } from "./auth/owner-auth.js";
import { createGitHubUpdateFeedReader, parseConfiguredUpdateFeedSources } from "./update-feed.js";
import { openLocalStore } from "@grimmlink/persistence";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalJobsRouteSource } from "./local-jobs-sqlite.js";
import { createLocalDevicesRouteSource } from "./local-devices-sqlite.js";
import { createLocalReadingRouteSource } from "./local-reading-sqlite.js";
import { createLocalIdentityRouteSource } from "./local-identity-sqlite.js";
import { createLocalUpdateReviewLedger } from "./local-update-review-sqlite.js";

const config = validateEnvironment(process.env);
const ownerAuth = createOwnerAuthenticatorFromEnvironment(process.env);
const configuredSources = process.env.GRIMMLINK_UPDATE_FEED_SOURCES?.trim();
const updateSources = configuredSources ? parseConfiguredUpdateFeedSources(configuredSources) : [];
if (updateSources.length > 0 && !ownerAuth) {
  throw new Error("UPDATE_FEED_REQUIRES_OWNER_AUTH");
}
const updateFeed =
  updateSources.length > 0 ? createGitHubUpdateFeedReader({ sources: updateSources }) : undefined;
const localStore = openLocalStore(
  config.SQLITE_PATH,
  resolve(fileURLToPath(new URL("../../../packages/persistence/migrations", import.meta.url))),
);
const server = await buildServer(config.LOG_LEVEL, {
  ...(ownerAuth ? { ownerAuth } : {}),
  ...(updateFeed ? { updateFeed } : {}),
  ...(ownerAuth ? { localJobs: createLocalJobsRouteSource(localStore, ownerAuth) } : {}),
  ...(ownerAuth ? { localDevices: createLocalDevicesRouteSource(localStore, ownerAuth) } : {}),
  ...(ownerAuth ? { localReading: createLocalReadingRouteSource(localStore, ownerAuth) } : {}),
  ...(ownerAuth ? { localIdentity: createLocalIdentityRouteSource(localStore, ownerAuth) } : {}),
  ...(updateFeed ? { updateReviewLedger: createLocalUpdateReviewLedger(localStore) } : {}),
});
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  try {
    await server.close();
  } finally {
    localStore.close();
  }
};
process.once("SIGTERM", () => {
  void close();
});
process.once("SIGINT", () => {
  void close();
});
try {
  await server.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  server.log.error({ err: error }, "Adapter startup failed");
  process.exitCode = 1;
  await close();
}
