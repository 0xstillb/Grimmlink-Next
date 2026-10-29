/**
 * Phase02 contract-only Official read client. It has NO global fetch implementation,
 * no live endpoint configuration and no capability to use an Official bearer token.
 * A synthetic, explicitly injected transport is the only execution surface.
 * Runtime Spring/ACL reconciliation and live connectivity remain blocked.
 */
export type OfficialReadScope = Readonly<{
  kind: "admin" | "reader";
  subjectId: string;
}>;

export type MockReadRequest = Readonly<{
  method: "GET";
  path: string;
  headers: Readonly<{ accept: "application/json"; "x-correlation-id": string }>;
  scope: OfficialReadScope;
  signal: AbortSignal;
}>;
export type MockReadResponse = Readonly<{ status: number; json: unknown }>;
export type MockOnlyTransport = (request: MockReadRequest) => Promise<MockReadResponse>;

export type OfficialClientErrorCode =
  | "INVALID_REQUEST"
  | "TIMEOUT"
  | "NETWORK_FAILURE"
  | "AUTH_DENIED"
  | "NOT_FOUND"
  | "UPSTREAM_UNAVAILABLE"
  | "INVALID_RESPONSE";

export class OfficialClientError extends Error {
  override name = "OfficialClientError";
  readonly code: OfficialClientErrorCode;
  constructor(code: OfficialClientErrorCode) {
    // Never reflect path, request headers, body, upstream text or URL in errors.
    super(code);
    this.code = code;
  }
}

export type MockOnlyReadOptions<T> = Readonly<{
  path: string;
  scope: OfficialReadScope;
  correlationId: string;
  validate: (value: unknown) => value is T;
}>;

export interface MockOnlyClientOptions {
  transport: MockOnlyTransport;
  timeoutMs?: number;
  maxAttempts?: number;
  wait?: (milliseconds: number) => Promise<void>;
}

const safePath = (path: string): boolean =>
  /^\/api\/[a-z0-9/_-]+$/.test(path) &&
  path.length <= 256 &&
  !path.includes("//") &&
  !path.endsWith("/") &&
  !path.split("/").some((part) => part === "." || part === "..");
const safeSubject = (value: string): boolean => /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const safeCorrelation = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const defaultWait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

/** No ambient fetch is available from this factory. Mock-only by construction. */
export function createMockOnlyOfficialClient(options: MockOnlyClientOptions) {
  const timeoutMs = options.timeoutMs ?? 1500;
  const maxAttempts = options.maxAttempts ?? 2;
  if (
    typeof options.transport !== "function" ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs < 1 ||
    timeoutMs > 10_000 ||
    !Number.isSafeInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 3 ||
    (options.wait !== undefined && typeof options.wait !== "function")
  ) {
    throw new OfficialClientError("INVALID_REQUEST");
  }
  const wait = options.wait ?? defaultWait;

  return {
    async readJson<T>(input: MockOnlyReadOptions<T>): Promise<T> {
      if (
        !safePath(input.path) ||
        !safeCorrelation(input.correlationId) ||
        (input.scope.kind !== "admin" && input.scope.kind !== "reader") ||
        !safeSubject(input.scope.subjectId) ||
        typeof input.validate !== "function"
      ) {
        throw new OfficialClientError("INVALID_REQUEST");
      }
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          const expiry = new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              controller.abort();
              reject(new OfficialClientError("TIMEOUT"));
            }, timeoutMs);
          });
          const response = await Promise.race([
            options.transport({
              method: "GET",
              path: input.path,
              scope: { kind: input.scope.kind, subjectId: input.scope.subjectId },
              headers: { accept: "application/json", "x-correlation-id": input.correlationId },
              signal: controller.signal,
            }),
            expiry,
          ]);
          if (!Number.isInteger(response.status) || response.status < 100 || response.status > 599)
            throw new OfficialClientError("INVALID_RESPONSE");
          if (response.status === 401 || response.status === 403)
            throw new OfficialClientError("AUTH_DENIED");
          if (response.status === 404) throw new OfficialClientError("NOT_FOUND");
          if (response.status !== 200) {
            if ([502, 503, 504].includes(response.status)) {
              if (attempt < maxAttempts) {
                await wait(100 * attempt);
                continue;
              }
              throw new OfficialClientError("UPSTREAM_UNAVAILABLE");
            }
            throw new OfficialClientError("INVALID_RESPONSE");
          }
          if (!input.validate(response.json)) throw new OfficialClientError("INVALID_RESPONSE");
          return response.json;
        } catch (cause: unknown) {
          const error =
            cause instanceof OfficialClientError
              ? cause
              : new OfficialClientError("NETWORK_FAILURE");
          if (
            attempt < maxAttempts &&
            (error.code === "NETWORK_FAILURE" || error.code === "TIMEOUT")
          ) {
            await wait(100 * attempt);
            continue;
          }
          throw error;
        } finally {
          if (timeout !== undefined) clearTimeout(timeout);
        }
      }
      throw new OfficialClientError("UPSTREAM_UNAVAILABLE");
    },
  };
}

/** Version/capability response is a mock contract, not an asserted Official endpoint. */
export interface MockVersionCapabilities {
  version: string;
  capabilities: string[];
}
export function isMockVersionCapabilities(value: unknown): value is MockVersionCapabilities {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.version === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(candidate.version) &&
    Array.isArray(candidate.capabilities) &&
    candidate.capabilities.length <= 64 &&
    candidate.capabilities.every(
      (x: unknown) => typeof x === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(x),
    )
  );
}
