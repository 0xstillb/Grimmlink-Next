import { expect, it } from "vitest";
import { encodeEventReplay, parseLastEventId } from "./event-wire.js";
it("supports validated Last-Event-ID and safe replay", () => {
  expect(parseLastEventId(undefined)).toBe(0);
  expect(parseLastEventId("42")).toBe(42);
  expect(
    encodeEventReplay([
      { seq: 1, jobId: "j1", transition: "ENQUEUED", code: "LOCAL_PLAN_ONLY", occurredAt: 100 },
    ]),
  ).toContain("id: 1\nevent: job\ndata:");
  for (const s of ["-1", "NaN", "001", "999999999999999999999"])
    expect(() => parseLastEventId(s)).toThrow();
  expect(() =>
    encodeEventReplay([
      { seq: 1, jobId: "x\nInjected", transition: "OK", code: "OK", occurredAt: 1 },
    ]),
  ).toThrow();
});
