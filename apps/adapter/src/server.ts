import Fastify, { type FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import { randomUUID } from "node:crypto";
import { HealthSchema, type Health } from "@grimmlink/contracts";
import {
  createLogger,
  createScopedDiagnostics,
  DiagnosticLeases,
  SafeLogBuffer,
} from "@grimmlink/observability";
import {
  registerIsolatedDiagnosticsRoutes,
  type IsolatedDiagnosticsSource,
} from "./diagnostics-routes.js";
import { classifyGatewayRequest } from "./gateway/route-policy.js";
import type { OwnerAuthenticator } from "./auth/owner-auth.js";
import { registerIsolatedUpdateFeedRoutes, type UpdateFeedReader } from "./update-feed.js";

export type AdapterDiagnostics = Readonly<{
  buffers: Readonly<Record<string, SafeLogBuffer>>;
  leases: DiagnosticLeases;
}>;

export type AdapterServerOptions = Readonly<{
  /**
   * Routes stay unmounted unless the application supplies both trusted
   * owner-session and CSRF verifiers. Never derive these callbacks from request
   * headers or environment-controlled booleans.
   */
  diagnostics?: Pick<IsolatedDiagnosticsSource, "authorizeOwner" | "verifyCsrf">;
  /** Optional one-owner local login; absent configuration leaves protected routes unmounted. */
  ownerAuth?: OwnerAuthenticator;
  /** Optional bounded public GitHub release/advisory feed; requires owner auth. */
  updateFeed?: UpdateFeedReader;
}>;

const diagnosticsByServer = new WeakMap<object, AdapterDiagnostics>();

/** Process-local diagnostics state; no HTTP endpoint or authorization bypass. */
export function getAdapterDiagnostics(server: object): AdapterDiagnostics | null {
  return diagnosticsByServer.get(server) ?? null;
}

/** Phase01 exposes ONLY local health and its schema. No gateway/proxy routes. */
export async function buildServer(
  logLevel: "info" | "warn" | "error" = "info",
  options: AdapterServerOptions = {},
) {
  if (options.diagnostics && options.ownerAuth) {
    throw new Error("Specify ownerAuth or test diagnostics guards, not both");
  }
  if (options.updateFeed && !options.ownerAuth) {
    throw new Error("An update feed requires the configured local owner authenticator");
  }
  const buffer = new SafeLogBuffer("adapter");
  const leases = new DiagnosticLeases();
  const buffers = Object.freeze({ adapter: buffer });
  const diagnostics: AdapterDiagnostics = Object.freeze({ buffers, leases });
  const destination = {
    write(chunk: string) {
      process.stdout.write(chunk);
      buffer.write(chunk);
    },
  };
  const scoped = createScopedDiagnostics("adapter", leases, destination);
  const server = Fastify({
    loggerInstance: createLogger("adapter", logLevel, destination),
    genReqId: () => randomUUID(),
    disableRequestLogging: true,
  });
  diagnosticsByServer.set(server, diagnostics);
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
    if (decision === "LOCAL_READ" || decision === "LOCAL_DIAGNOSTICS" || decision === "LOCAL_AUTH")
      return;
    return reply.code(decision === "INVALID_TARGET" ? 400 : 403).send({
      error: decision === "INVALID_TARGET" ? "INVALID_REQUEST_TARGET" : "UPSTREAM_DENIED",
    });
  });
  server.addHook("onSend", async (req, reply, payload) => {
    reply.header("x-correlation-id", req.id);
    return payload;
  });
  server.addHook("onResponse", (request) => {
    const level = leases.levelFor("adapter");
    if (level === "info") return;
    const signal = {
      code: "REQUEST_SUMMARY" as const,
      count: 1,
      request: { id: request.id, method: request.method },
    };
    if (level === "trace") scoped.trace(signal);
    else scoped.debug(signal);
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
  if (options.ownerAuth) {
    options.ownerAuth.registerRoutes(server as unknown as FastifyInstance);
  }
  const diagnosticsGuards = options.ownerAuth ?? options.diagnostics;
  if (diagnosticsGuards) {
    // The route factory uses Fastify's default logger generic; route behavior
    // is identical for this server's Pino logger instance.
    registerIsolatedDiagnosticsRoutes(server as unknown as FastifyInstance, {
      buffers,
      leases,
      ...diagnosticsGuards,
    });
  }
  if (options.updateFeed && options.ownerAuth) {
    registerIsolatedUpdateFeedRoutes(server as unknown as FastifyInstance, {
      authorizeOwner: options.ownerAuth.authorizeOwner,
      reader: options.updateFeed,
    });
  }
  // NO fallback, Official backend client, reading proxy, or runtime feature toggles.
  return server;
}
