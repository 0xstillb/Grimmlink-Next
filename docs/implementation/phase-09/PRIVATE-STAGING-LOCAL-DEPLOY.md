# Private Staging deployment: local reader API

This profile deploys the Adapter and its Caddy gateway on the existing
`192.168.1.116` host. Grimmory typically uses `6060`; this Adapter binds
private-LAN port `6062` to avoid a port collision. SQLite lives in
`./staging-data`, and uses an internal Docker network. It has no Grimmory or NAS
container/network mount and makes no Official requests. Do not reuse this profile
for production.

## Prepare and start

Run these commands from the repository root on the Staging host as the account
with UID 1000. `prepare-private-staging.sh` prompts for a new Staging owner
password, writes only its scrypt hash and a generated signing key to the ignored
mode-0600 `.env.staging`, and creates the local SQLite directory.

```sh
bash scripts/phase-09/prepare-private-staging.sh
docker compose -p grimmlink-staging-local -f compose.phase08.staging-local.yml config
docker compose -p grimmlink-staging-local -f compose.phase08.staging-local.yml up -d --build
curl --fail http://192.168.1.116:6062/health
```

The first deployment creates an isolated one-owner Staging login. Pairing
credentials and test-file identities belong to this Staging Adapter only. Do not
copy credentials from Grimmory or mount the NAS into the Adapter.

## Local Adapter smoke sequence

1. Run `bash scripts/phase-09/staging-local-smoke.sh` from the repo root. It
   prompts for the Staging owner password without echoing it, creates a
   disposable local reader and file identity, sends real HTTP session START and
   STOP events to the deployed Adapter, revokes the reader, and confirms the
   revoked token fails. It prints IDs and statuses only, never the pairing token.
2. The script's test file and event receipts persist in `staging-data`; the
   temporary pairing is revoked and its token is removed from memory.

This validates the live Adapter over the private LAN. It does not read or write
Grimmory or NAS data. A separate read-only Grimmory catalog check uses the
existing Grimmory OPDS endpoint on port `6060` and the owner's OPDS account
linked to the owner's Grimmory user. No test-library restriction is required
for this single-owner catalog read. Keep the OPDS password out of the Adapter
env file and enter it only at the interactive catalog-read prompt. The plugin
fetches only the OPDS catalog; it does not follow book-file links.

To stop the local Adapter without affecting other containers or data:

```sh
docker compose -p grimmlink-staging-local -f compose.phase08.staging-local.yml down
```

`down` deliberately leaves `staging-data` intact. Delete only that directory
after confirming the test receipts are disposable and no longer needed.
