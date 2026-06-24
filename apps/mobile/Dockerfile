# ─── Stage 1: Install deps and export Expo web static bundle ──────────────────
FROM node:20-slim AS builder
WORKDIR /monorepo
RUN apt-get update -y && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# Copy root monorepo config and lock files
COPY package.json yarn.lock .yarnrc.yml ./

# Copy package.json files for workspaces
COPY apps/mobile/package.json ./apps/mobile/

# Install dependencies (including devDeps to run build)
RUN corepack yarn install

# Inject production API URL build arg
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

# Copy mobile client source code
COPY apps/mobile ./apps/mobile

# Build static bundle for Web platform (places output in apps/mobile/dist/)
RUN corepack yarn workspace @deluxnet/mobile build

# ─── Stage 2: Serve static files using Nginx ──────────────────────────────────
FROM nginx:alpine
COPY --from=builder /monorepo/apps/mobile/dist /usr/share/nginx/html

# Custom nginx configuration to handle single-page application routing falls
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
