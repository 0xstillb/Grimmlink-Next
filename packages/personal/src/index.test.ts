import { expect, it } from "vitest";
import {
  assertPersonalWriteAuthorized,
  personalWriteCapability,
  planOfflineShelf,
  validateOfflinePersonalValue,
} from "./index.js";

it("keeps every personal bridge OFF and validates bounded note/rating data", () => {
  expect(Object.values(personalWriteCapability).every((x) => x === false)).toBe(true);
  expect(assertPersonalWriteAuthorized).toThrow("PERSONAL_BRIDGE_DISABLED_PHASE09");
  expect(validateOfflinePersonalValue({ kind: "RATING", score: 5 })).toEqual({
    kind: "RATING",
    score: 5,
  });
  expect(() => validateOfflinePersonalValue({ kind: "RATING", score: 0 })).toThrow();
  expect(() => validateOfflinePersonalValue({ kind: "RATING", score: 5, owner: "other" })).toThrow();
  expect(() =>
    validateOfflinePersonalValue({
      kind: "ANNOTATION",
      nativePosition: "epubcfi(/6/2!/4/2:0)",
      quote: "ข้อความ",
      note: "note",
    }),
  ).not.toThrow();
  expect(() =>
    validateOfflinePersonalValue({
      kind: "ANNOTATION",
      nativePosition: "javascript:evil",
      quote: "quote",
      note: "",
    }),
  ).toThrow();
});

it("requires explicit manual shelf preview; no membership writes", () => {
  expect(planOfflineShelf("MANUAL_OWNER_ACTION", ["one", "two"], ["two", "three"])).toEqual({
    mode: "MANUAL_PREVIEW_ONLY",
    add: ["three"],
    remove: ["one"],
    unchanged: ["two"],
  });
  expect(() => planOfflineShelf("AUTO" as never, [], ["x"])).toThrow();
  expect(() => planOfflineShelf("MANUAL_OWNER_ACTION", ["x", "x"], [])).toThrow();
  expect(() => planOfflineShelf("MANUAL_OWNER_ACTION", [], ["../bad"])).toThrow();
});
