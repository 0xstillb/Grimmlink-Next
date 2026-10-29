import { describe, expect, it } from "vitest";
import { validateEnvironment, ConfigurationError } from "./index.js";

describe("adapter environment", () => {
  it("defaults to loopback with upstream disabled elsewhere", () => {
    expect(validateEnvironment({}).HOST).toBe("127.0.0.1");
  });
  it("rejects wildcard listener and invalid port", () => {
    expect(() => validateEnvironment({ HOST: "0.0.0.0" })).toThrow(ConfigurationError);
    expect(() => validateEnvironment({ PORT: 70000 })).toThrow(ConfigurationError);
  });
  it("never echoes provided secrets on validation failure", () => {
    expect(() => validateEnvironment({ PORT: "secret-plaintext" })).toThrow(
      "values intentionally redacted",
    );
  });
});
