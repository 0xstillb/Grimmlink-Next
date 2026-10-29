import { validateEnvironment } from "@grimmlink/contracts";
import { buildServer } from "./server.js";

const config = validateEnvironment(process.env);
const server = buildServer();
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await server.close();
};
process.once("SIGTERM", () => { void close(); });
process.once("SIGINT", () => { void close(); });
try {
  await server.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  server.log.error({ err: error }, "Adapter startup failed");
  process.exitCode = 1;
  await close();
}
