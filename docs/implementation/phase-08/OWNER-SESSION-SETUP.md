# Local Control Center owner session

This login protects the local Control Center diagnostics API. It is not a Grimmory Official login, a reader pairing flow, or authorization for Official forwarding or protected writes. Those routes remain `DENY_ALL` / `OFF`.

The owner routes are disabled unless both `GRIMMLINK_OWNER_PASSWORD_HASH` and `GRIMMLINK_SESSION_SIGNING_KEY` are configured. The password itself is never stored by the Adapter. Sessions use an HttpOnly, SameSite=Strict cookie, expire after 10 minutes, and are kept in a bounded process-local registry so logout and process restart revoke them. Mutations also require the exact configured Origin and a session-bound CSRF token. Login attempts are rate-limited to five per minute with at most two concurrent scrypt checks.

## PowerShell setup for the loopback mock

Run these commands from the repository root. The password is requested as a secure PowerShell prompt; only its derived scrypt verifier and random session key are passed to the Compose process.

```powershell
$ownerSecret = Read-Host "Local Control Center password (12+ characters)" -AsSecureString
$ownerPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ownerSecret)
try {
  $ownerPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ownerPointer)
  $env:GRIMMLINK_OWNER_PASSWORD_HASH = ($ownerPlain | node apps/adapter/scripts/hash-owner-password.mjs).Trim()
  $env:GRIMMLINK_SESSION_SIGNING_KEY = (node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))").Trim()
  $env:GRIMMLINK_PUBLIC_ORIGIN = "http://127.0.0.1:5173"
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ownerPointer)
  Remove-Variable ownerPlain, ownerPointer, ownerSecret -ErrorAction SilentlyContinue
}

docker compose -f compose.phase02.mock.yml up --build -d
```

In another PowerShell window, start the loopback-only Control Center dev server:

```powershell
pnpm --filter @grimmlink/control-center dev
```

Open `http://127.0.0.1:5173`. The Vite dev server proxies `/api` and `/health` to the loopback Gateway on port 6060; it binds only to `127.0.0.1`. Use this exact origin while signing in. Do not use a LAN address or publish the Vite port.

The Phase02 Compose mock uses Docker `json-file` log rotation capped at 10 MiB × 3 files per container. The authenticated diagnostics API reads only the Adapter's bounded in-memory safe-event buffer; it does not expose Docker's disk logs. Authenticated server bundles are also process-memory only, capped at eight bundles for one hour; they are not persisted across restarts.

## Optional GitHub update evidence

The read-only feed is disabled unless owner auth is configured and `GRIMMLINK_UPDATE_FEED_SOURCES` contains a JSON array of `{ "id", "owner", "repository" } entries. IDs are lower-case slugs; the server constructs requests only for `https://api.github.com`, omits credentials, rejects redirects, and bounds streamed bytes and advisory pages. The Update Center lists configured IDs after owner login and fetches public evidence only when the owner selects **Fetch release evidence**. Public payloads remain unverified; compatibility and impact remain unknown, approval remains unauthorized, and asset download, installation and rollback remain disabled. Do not put tokens or arbitrary URLs in this setting. Network-level egress restrictions have not been exercised locally; production network policy remains for Phase09.

## Optional GitHub update evidence

The read-only update feed remains disabled unless owner auth is configured and `GRIMMLINK_UPDATE_FEED_SOURCES` contains a JSON array of `{ "id", "owner", "repository" }` entries. The source ID is a lower-case slug; the server constructs URLs only on `https://api.github.com`, omits credentials, rejects redirects, bounds streamed bytes and advisory pages, and returns release/advisory evidence as unverified. The Update Center can display that evidence, but compatibility and impact remain unknown, approval remains unauthorized, and downloads/install/rollback are not enabled. Do not add tokens or URLs to the configuration.
