# ─── Stage 1: Install all deps (including devDeps for Next.js build) ──────────
FROM node:20-slim AS deps
WORKDIR /monorepo
RUN apt-get update -y && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/web/package.json ./apps/web/
RUN corepack yarn install

# ─── Stage 2: Build Next.js ───────────────────────────────────────────────────
FROM deps AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/web ./apps/web
RUN corepack yarn workspace @deluxnet/web build

# ─── Stage 3: Minimal production runtime (Next.js standalone) ─────────────────
FROM node:20-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output in a monorepo workspace places the server at
# .next/standalone/ with sub-paths matching the monorepo structure
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/.next/static ./apps/web/.next/static

# Copy public assets (may be empty but must exist)
COPY --from=builder --chown=nextjs:nodejs /monorepo/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# In a monorepo standalone build, server.js lives under apps/web/
CMD ["node", "apps/web/server.js"]
