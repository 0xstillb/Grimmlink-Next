import { request as httpRequest } from "node:http";
import { OfficialClientError, type MockOnlyTransport } from "./mock-transport.js";

/**
 * Real HTTP mechanics tested against a synthetic loopback server ONLY.
 *
 * This implementation is deliberately NOT imported by the adapter and NOT
 * exposed from the package entrypoint. It cannot be configured for a LAN,
 * domain, reverse proxy, real Official host or authenticated user session.
 * No cookies, Authorization, KO secret or HTTP redirects can be forwarded.
 */
export function createLoopbackJsonTransport(
  port: number,
  maxResponseBytes = 262144,
): MockOnlyTransport {
  if (
    !Number.isSafeInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    !Number.isSafeInteger(maxResponseBytes) ||
    maxResponseBytes < 1 ||
    maxResponseBytes > 1048576
  ) {
    throw new OfficialClientError("INVALID_REQUEST");
  }
  return async (request) => {
    if (
      request.method !== "GET" ||
      !/^\/api\/[a-z0-9/_-]+$/.test(request.path) ||
      request.path.length > 256 ||
      request.path.includes("//") ||
      request.path.endsWith("/") ||
      request.signal.aborted ||
      !/^[0-9a-f-]{36}$/i.test(request.headers["x-correlation-id"])
    ) {
      throw new OfficialClientError("INVALID_REQUEST");
    }
    return await new Promise<{ status: number; json: unknown }>((resolve, reject) => {
      let done = false;
      const finish = (
        error: OfficialClientError | null,
        response?: { status: number; json: unknown },
      ) => {
        if (done) return;
        done = true;
        request.signal.removeEventListener("abort", abort);
        if (error) reject(error);
        else if (response) resolve(response);
        else reject(new OfficialClientError("INVALID_RESPONSE"));
      };
      const client = httpRequest(
        {
          host: "127.0.0.1",
          port,
          method: "GET",
          path: request.path,
          agent: false,
          timeout: 5000,
          headers: {
            Accept: "application/json",
            "X-Correlation-Id": request.headers["x-correlation-id"],
          },
        },
        (upstream) => {
          const status = upstream.statusCode ?? 0;
          if (status !== 200) {
            // Never read or reflect an error body containing upstream secrets.
            upstream.resume();
            finish(null, { status, json: null });
            return;
          }
          const contentType = upstream.headers["content-type"];
          if (
            typeof contentType !== "string" ||
            !/^application\/json(?:\s*;|$)/i.test(contentType)
          ) {
            upstream.destroy();
            finish(new OfficialClientError("INVALID_RESPONSE"));
            return;
          }
          const chunks: Buffer[] = [];
          let bytes = 0;
          upstream.on("data", (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > maxResponseBytes) {
              upstream.destroy();
              finish(new OfficialClientError("INVALID_RESPONSE"));
              return;
            }
            chunks.push(chunk);
          });
          upstream.once("error", () => finish(new OfficialClientError("NETWORK_FAILURE")));
          upstream.once("end", () => {
            try {
              const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
              finish(null, { status, json: parsed });
            } catch {
              finish(new OfficialClientError("INVALID_RESPONSE"));
            }
          });
        },
      );
      const abort = () => {
        client.destroy();
        finish(new OfficialClientError("TIMEOUT"));
      };
      request.signal.addEventListener("abort", abort, { once: true });
      client.once("timeout", abort);
      client.once("error", () => finish(new OfficialClientError("NETWORK_FAILURE")));
      client.end();
    });
  };
}
