# ---------- base: shared setup ----------
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---------- build: install, compile, extract ----------
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter "@helio/api..."

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @helio/api db:generate
RUN pnpm --filter @helio/shared build && pnpm --filter @helio/api build
RUN pnpm --filter @helio/api deploy --prod /out

# ---------- runtime: only what runs ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]