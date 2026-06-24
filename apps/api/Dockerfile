# ─── Stage 1: Install all deps (including devDeps for build) ──────────────────
FROM node:20-slim AS deps
WORKDIR /monorepo
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json ./apps/api/
RUN corepack yarn install

# ─── Stage 2: Generate Prisma client + Build NestJS ───────────────────────────
FROM deps AS builder
# Copy schema first so prisma generate can run
COPY apps/api/prisma ./apps/api/prisma
# Generate the Prisma client BEFORE TypeScript compilation
RUN corepack yarn workspace @deluxnet/api prisma:generate
# Now copy source and build
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/nest-cli.json ./apps/api/
RUN corepack yarn workspace @deluxnet/api build

# ─── Stage 3: Production runtime ──────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /monorepo
ENV NODE_ENV=production

# OpenSSL required by Prisma CLI at runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# Production deps (includes prisma as dev dep for migration CLI)
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/api/package.json ./apps/api/
RUN corepack yarn install

# Copy dist, prisma files and generated client from builder
COPY --from=builder /monorepo/apps/api/dist ./apps/api/dist
COPY --from=builder /monorepo/apps/api/prisma ./apps/api/prisma
COPY --from=builder /monorepo/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
