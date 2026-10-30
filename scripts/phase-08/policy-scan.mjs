import { readFile } from "node:fs/promises";

/** Narrow, testable static Phase08 invariants, NOT a full SAST review. */
const files = {
  server: await readFile("apps/adapter/src/server.ts", "utf8"),
  policy: await readFile("apps/adapter/src/gateway/route-policy.ts", "utf8"),
  ui: await readFile("apps/control-center/src/App.tsx", "utf8"),
  model: await readFile("apps/control-center/src/phase08-model.ts", "utf8"),
  docker: await readFile("Dockerfile", "utf8"),
  active: await readFile("docs/implementation/ACTIVE-SESSION.json", "utf8"),
};
const session = JSON.parse(files.active);
const fail = (name) => { throw new Error("PHASE08_POLICY_SCAN_FAILED:" + name); };
if (!files.policy.includes('"DENY_UPSTREAM"') || !files.server.includes("classifyGatewayRequest")) fail("GATEWAY_GUARD");
if (/phase08|update-center|diagnostic/i.test(files.server) && /server\.(post|put|patch|delete)\(/i.test(files.server)) fail("UNEXPECTED_PHASE08_MUTATION");
if (files.ui.includes("dangerouslySetInnerHTML") || files.ui.includes("localStorage")) fail("UI_UNSAFE_STATE");
if (!files.model.includes('credentials: "same-origin"') || !files.model.includes("safeDiagnosticExport")) fail("DIAGNOSTICS_ALLOWLIST");
if (!files.docker.includes("USER node")) fail("CONTAINER_USER");
for (const [name, expected] of Object.entries({
  officialGatewayForwarding: "DENY_ALL",
  nativeKosyncProgress: "OFF",
  metadataApply: "OFF",
  personalBridge: "OFF",
  sessionBridge: "OFF",
  productionDeployment: "NOT_AUTHORIZED",
})) {
  if (session.safety?.[name] !== expected) fail(name);
}
process.stdout.write("Phase08 narrow static policy checks passed; not a comprehensive SAST clearance\n");
