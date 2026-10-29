import Fastify from "fastify";
import swagger from "@fastify/swagger";
import { randomUUID } from "node:crypto";
import { HealthSchema, type Health } from "@grimmlink/contracts";
import { createLogger } from "@grimmlink/observability";

/** Phase01 exposes ONLY local health and its schema. No gateway/proxy routes. */
export function buildServer() {
  const server = Fastify({
    loggerInstance: createLogger("adapter"),
    genReqId: () => randomUUID(),
    disableRequestLogging: true
  });
  // Plugin registration happens before routes; Fastify builds the OpenAPI
  // document from the same TypeBox route schema, no hand-maintained drift.
  void server.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: { title: "GrimmLink Next Foundation", version: "0.1.0" },
      servers: [{ url: "http://127.0.0.1:6060" }]
    }
  });
  server.addHook("onSend", async (req, reply, payload) => {
    reply.header("x-correlation-id", req.id);
    return payload;
  });
  server.get("/health", {
    schema: { description: "Adapter process only; does not assert backend health", response: { 200: HealthSchema } }
  }, async (): Promise<Health> => ({
    status: "foundation-only",
    upstreamConnected: false,
    phase: "01",
    timestamp: new Date().toISOString()
  }));
  server.get("/openapi.json", { schema: { hide: true } }, async () => server.swagger());
  // NO fallback, Official backend client, reading proxy, or runtime feature toggles.
  return server;
}
