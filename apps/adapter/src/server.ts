import Fastify from "fastify";
import { HealthSchema, type Health } from "@grimmlink/contracts";
import { createLogger } from "@grimmlink/observability";
import type { FastifyInstance } from "fastify";

export function buildServer(): FastifyInstance {
  const server = Fastify({ loggerInstance: createLogger("adapter") });
  server.get("/health", {
    schema: { response: { 200: HealthSchema } }
  }, async (): Promise<Health> => ({
    status: "foundation-only",
    upstreamConnected: false,
    phase: "01",
    timestamp: new Date().toISOString()
  }));
  // Intentionally NO catch-all and NO upstream proxy. Phase02 owns forwarding.
  return server;
}
