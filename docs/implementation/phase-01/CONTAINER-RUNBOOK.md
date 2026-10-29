# Phase01 Docker contract — ISOLATED / NOT DEPLOYED

This image is not a production gateway. It compiles the native better-sqlite3 binding for the target Docker build platform (linux/arm64 on Raspberry Pi), runs the local-only Fastify process as non-root, and provides a local healthcheck.

- No upstream host, API tokens, NAS, device, Docker socket, network forwarding, or real sync in image.
- Default `HOST=127.0.0.1`; only localhost inside container. The compose file uses `network_mode: none`, **no host ports** and `read_only: true`; it is not a network-accessible dashboard.
- The `EXPOSE 6060` image metadata is **not** a port publication. Phase02 must own any gateway ingress and prove access controls before publishing a port.
- Compose log rotation is `json-file` with `max-size=10m`, `max-file=3`. Dockerfile alone cannot enforce daemon log caps; do not run unbounded `docker run` and assume rotation.
- Reproducible install requires a checked-in pnpm-lock.yaml and `pnpm install --frozen-lockfile`. ARM64 native install/build and QEMU or physical ARM64 validation still need CI proof.
- Migrations and actual persistent database boot integration are not connected to the process at this stage. Full NAS/Hermes/reader E2E is reserved to Phase09.
- Base image is currently patch-tag pinned `node:22.16.0-bookworm-slim`, **not digest pinned**. Resolve immutable image digest or record registry provenance before production readiness.
