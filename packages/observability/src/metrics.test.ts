import { describe, it, expect } from "vitest";
import { createMetricSample, METRIC_CONTRACTS } from "./metrics.js";

describe("Phase01 metric contracts only", () => {
  it("defines units and fixed names without recording any real data", () => {
    expect(METRIC_CONTRACTS.adapter_uptime_seconds.unit).toBe("seconds");
    expect(METRIC_CONTRACTS.local_job_queue_depth.type).toBe("gauge");
    expect(createMetricSample("local_job_queue_depth", 0, "jobs")).toEqual({
      name: "local_job_queue_depth",
      value: 0,
      module: "jobs",
    });
  });
  it("rejects unknown metric names, unbounded values and arbitrary labels", () => {
    expect(() => createMetricSample("private_device_id" as never, 1, "jobs")).toThrow(
      "Unknown metric",
    );
    expect(() => createMetricSample("sqlite_busy_retries_total", 1.5, "persistence")).toThrow(
      "Invalid metric",
    );
    expect(() => createMetricSample("adapter_uptime_seconds", Number.NaN, "adapter")).toThrow(
      "Invalid metric",
    );
    expect(() => createMetricSample("adapter_uptime_seconds", 1, "secret-user" as never)).toThrow(
      "Invalid metric module",
    );
  });
});
