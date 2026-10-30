import Fastify from "fastify";
import swagger from "@fastify/swagger";
import { randomUUID } from "node:crypto";
import { HealthSchema, type Health } from "@grimmlink/contracts";
import { createLogger } from "@grimmlink/observability";
import { classifyGatewayRequest } from "./gateway/route-policy.js";

/** Phase01 exposes ONLY local health and its schema. No gateway/proxy routes. */
export async function buildServer(logLevel: "info" | "warn" | "error" = "info") {
  const server = Fastify({
    loggerInstance: createLogger("adapter", logLevel),
    genReqId: () => randomUUID(),
    disableRequestLogging: true,
  });
  // Plugin registration happens before routes; Fastify builds the OpenAPI
  // document from the same TypeBox route schema, no hand-maintained drift.
  await server.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: { title: "GrimmLink Next local adapter", version: "0.1.0" },
      servers: [{ url: "http://127.0.0.1:6060" }],
    },
  });
  // Pre-body, pre-routing safety gate. No Official transport exists or is called.
  // This is the first executable deny-before-forward layer, NOT runtime ACL proof.
  server.addHook("onRequest", async (req, reply) => {
    const decision = classifyGatewayRequest(req.method, req.raw.url ?? "", req.headers);
    if (decision === "LOCAL_READ") return;
    return reply.code(decision === "INVALID_TARGET" ? 400 : 403).send({
      error: decision === "INVALID_TARGET" ? "INVALID_REQUEST_TARGET" : "UPSTREAM_DENIED",
    });
  });
  server.addHook("onSend", async (req, reply, payload) => {
    reply.header("x-correlation-id", req.id);
    return payload;
  });
  server.get(
    "/health",
    {
      schema: {
        description: "Adapter process only; does not assert backend health",
        response: { 200: HealthSchema },
      },
    },
    async (): Promise<Health> => ({
      status: "foundation-only",
      upstreamConnected: false,
      phase: "01",
      timestamp: new Date().toISOString(),
    }),
  );
  server.get("/openapi.json", { schema: { hide: true } }, async () => server.swagger());
  server.get(
    "/api/grimmlink/v2/capabilities",
    {
      schema: {
        description: "Local phase capability flags; not an Official backend probe",
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: [
              "phase",
              "deploymentMode",
              "independentSecurityReview",
              "officialConnected",
              "gatewayForwarding",
              "personalBridge",
              "nativeKosyncProgress",
              "fullE2e",
            ],
            properties: {
              phase: { type: "string", const: "02" },
              deploymentMode: { type: "string", const: "SINGLE_OWNER_PRIVATE" },
              independentSecurityReview: { type: "string", const: "DEFERRED_TO_PHASE_09" },
              officialConnected: { type: "boolean", const: false },
              gatewayForwarding: { type: "string", const: "DENY_ALL" },
              personalBridge: { type: "string", const: "OFF" },
              nativeKosyncProgress: { type: "string", const: "OFF" },
              fullE2e: { type: "string", const: "DEFERRED_TO_PHASE_09" },
            },
          },
        },
      },
    },
    async () => ({
      phase: "02",
      deploymentMode: "SINGLE_OWNER_PRIVATE",
      independentSecurityReview: "DEFERRED_TO_PHASE_09",
      officialConnected: false,
      gatewayForwarding: "DENY_ALL",
      personalBridge: "OFF",
      nativeKosyncProgress: "OFF",
      fullE2e: "DEFERRED_TO_PHASE_09",
    }),
  );
  // Immutable local version manifest; no probe or Official capability assertion.
  server.get(
    "/api/grimmlink/v2/version",
    {
      schema: {
        description: "Local adapter version, not an Official backend version probe",
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: [
              "adapterVersion",
              "apiVersion",
              "phase",
              "mode",
              "officialConnected",
              "releaseAuthorization",
            ],
            properties: {
              adapterVersion: { type: "string", const: "0.1.0" },
              apiVersion: { type: "string", const: "v2" },
              phase: { type: "string", const: "02" },
              mode: { type: "string", const: "MOCK_ONLY" },
              officialConnected: { type: "boolean", const: false },
              releaseAuthorization: { type: "string", const: "NOT_AUTHORIZED" },
            },
          },
        },
      },
    },
    async () => ({
      adapterVersion: "0.1.0",
      apiVersion: "v2",
      phase: "02",
      mode: "MOCK_ONLY",
      officialConnected: false,
      releaseAuthorization: "NOT_AUTHORIZED",
    }),
  );
  // NO fallback, Official backend client, reading proxy, or runtime feature toggles.
  return server;
}
