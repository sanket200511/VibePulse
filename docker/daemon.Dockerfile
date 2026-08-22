# ─────────────────────────────────────────────────────────────────────────────
# VibePulse Daemon – Production Dockerfile
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Stage 1: dependencies ────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /repo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY apps/daemon/package.json ./apps/daemon/

RUN pnpm install --frozen-lockfile

# ── Stage 2: builder ─────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /repo/apps/daemon/node_modules ./apps/daemon/node_modules
COPY . .

RUN pnpm --filter @vibepulse/daemon build

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /repo/apps/daemon/dist ./dist
COPY --from=builder /repo/apps/daemon/node_modules ./node_modules

ENV NODE_ENV=production

EXPOSE 5135
CMD ["node", "dist/index.js"]
