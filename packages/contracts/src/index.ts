import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

/** No fake upstream data: these contracts describe the adapter process only. */
export const HealthSchema = Type.Object({
  status: Type.Literal("foundation-only"),
  upstreamConnected: Type.Literal(false),
  phase: Type.Literal("01"),
  timestamp: Type.String({ format: "date-time" })
}, { additionalProperties: false });
export type Health = Static<typeof HealthSchema>;

export const EnvironmentSchema = Type.Object({
  HOST: Type.Literal("127.0.0.1"),
  PORT: Type.Integer({ minimum: 1, maximum: 65535 }),
  LOG_LEVEL: Type.Union([Type.Literal("info"), Type.Literal("warn"), Type.Literal("error")]),
  SQLITE_PATH: Type.String({ minLength: 1 })
}, { additionalProperties: false });
export type Environment = Static<typeof EnvironmentSchema>;

export class ConfigurationError extends Error {
  override name = "ConfigurationError";
}
export function validateEnvironment(raw: Record<string, unknown>): Environment {
  const normalized = {
    HOST: raw.HOST ?? "127.0.0.1",
    PORT: raw.PORT === undefined ? 6060 : Number(raw.PORT),
    LOG_LEVEL: raw.LOG_LEVEL ?? "info",
    SQLITE_PATH: raw.SQLITE_PATH ?? "./data/adapter.sqlite"
  };
  if (!Value.Check(EnvironmentSchema, normalized)) {
    throw new ConfigurationError("Invalid adapter configuration (values intentionally redacted)");
  }
  return normalized as Environment;
}
