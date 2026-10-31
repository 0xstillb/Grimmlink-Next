import { validateEnvironment } from "@grimmlink/contracts";
import { buildServer } from "./server.js";
import { createOwnerAuthenticatorFromEnvironment } from "./auth/owner-auth.js";
import { createGitHubUpdateFeedReader, parseConfiguredUpdateFeedSources } from "./update-feed.js";

const config = validateEnvironment(process.env);
const ownerAuth = createOwnerAuthenticatorFromEnvironment(process.env);
const configuredSources = process.env.GRIMMLINK_UPDATE_FEED_SOURCES?.trim();
const updateSources = configuredSources ? parseConfiguredUpdateFeedSources(configuredSources) : [];
if (updateSources.length > 0 && !ownerAuth) {
  throw new Error("UPDATE_FEED_REQUIRES_OWNER_AUTH");
}
const updateFeed =
  updateSources.length > 0 ? createGitHubUpdateFeedReader({ sources: updateSources }) : undefined;
const server = await buildServer(config.LOG_LEVEL, {
  ...(ownerAuth ? { ownerAuth } : {}),
  ...(updateFeed ? { updateFeed } : {}),
});
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await server.close();
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
