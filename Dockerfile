# Foundation image ONLY. No Official upstream client, port publication, or NAS mounts.
# Native SQLite is compiled INSIDE the target platform stage (ARM64 on Hermes).
FROM node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34 AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json ./
RUN pnpm install --frozen-lockfile
RUN pnpm rebuild better-sqlite3
RUN pnpm build

FROM node:22.16.0-bookworm-slim@sha256:048ed02c5fd52e86fda6fbd2f6a76cf0d4492fd6c6fee9e2c463ed5108da0e34
ENV NODE_ENV=production HOST=127.0.0.1 PORT=6060 SQLITE_PATH=/app/data/adapter.sqlite
WORKDIR /app
RUN mkdir -p /app/data && chown -R node:node /app/data
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps ./apps
COPY --from=builder --chown=node:node /app/packages ./packages
USER node
EXPOSE 6060
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:6060/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","apps/adapter/dist/main.js"]
