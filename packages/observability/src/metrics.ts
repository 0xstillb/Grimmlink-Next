/**
 * Phase01 metrics are definitions only: no fabricated counts, no collection
 * from Grimmory/NAS/devices, and no arbitrary high-cardinality labels.
 */
export const METRIC_CONTRACTS = Object.freeze({
  adapter_uptime_seconds: Object.freeze({
    type: "gauge",
    unit: "seconds",
    description: "Local adapter process uptime",
  }),
  sqlite_busy_retries_total: Object.freeze({
    type: "counter",
    unit: "retries",
    description: "Local SQLite busy retry count",
  }),
  local_job_queue_depth: Object.freeze({
    type: "gauge",
    unit: "jobs",
    description: "Local pending job count",
  }),
  local_job_claims_total: Object.freeze({
    type: "counter",
    unit: "claims",
    description: "Local job reservation count",
  }),
} as const);

export type MetricName = keyof typeof METRIC_CONTRACTS;
export type MetricModule = "adapter" | "persistence" | "jobs";
export type MetricSample = Readonly<{
  name: MetricName;
  value: number;
  module: MetricModule;
}>;

/** Only bounded, numeric, local metrics with a fixed low-cardinality module. */
export function createMetricSample(
  name: MetricName,
  value: number,
  module: MetricModule,
): MetricSample {
  if (!Object.prototype.hasOwnProperty.call(METRIC_CONTRACTS, name)) {
    throw new Error("Unknown metric name");
  }
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (METRIC_CONTRACTS[name].type === "counter" && !Number.isSafeInteger(value))
  ) {
    throw new Error("Invalid metric value");
  }
  if (module !== "adapter" && module !== "persistence" && module !== "jobs") {
    throw new Error("Invalid metric module");
  }
  return Object.freeze({ name, value, module });
}
