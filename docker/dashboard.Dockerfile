# ─────────────────────────────────────────────────────────────────────────────
# VibePulse Dashboard – Production Dockerfile
#
# Not used during local development (Vite dev server is preferred).
# Used for staging / production builds served via static file hosting.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Stage 1: dependencies ────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /repo

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY apps/dashboard/package.json ./apps/dashboard/

RUN pnpm install --frozen-lockfile

# ── Stage 2: builder ─────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /repo/packages/config/node_modules ./packages/config/node_modules
COPY --from=deps /repo/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY . .

RUN pnpm --filter @vibepulse/dashboard build

# ── Stage 3: runtime (nginx) ─────────────────────────────────────────────────
FROM nginx:alpine AS runtime

COPY --from=builder /repo/apps/dashboard/dist /usr/share/nginx/html
COPY docker/nginx/dashboard.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
