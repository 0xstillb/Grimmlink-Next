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

The Phase02 Compose mock uses Docker `json-file` log rotation capped at 10 MiB × 3 files per container. The authenticated diagnostics API reads only the Adapter's bounded in-memory safe-event buffer; it does not expose Docker's disk logs. The support-bundle preview is still browser-local, and persistent authenticated bundle delivery is not implemented.
