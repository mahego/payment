# Deluxnet – Auth & Security Layer

Complete authentication, authorization and security layer for the Deluxnet ISP management platform.

---

## Structure

```text
apps/
  api/             NestJS backend
  web/             Next.js 15 frontend
  mobile/          Expo / React Native app
packages/
  contracts/       (shared types – future)
```

---

## Backend setup (`apps/api`)

```bash
cd apps/api
cp .env.example .env   # fill in secrets
yarn install
npx prisma generate
npx prisma migrate deploy   # or: prisma db push (dev)
yarn dev
```

Swagger available at `http://localhost:3001/docs` in development.

---

## Frontend setup (`apps/web`)

```bash
cd apps/web
cp .env.example .env.local
yarn install
yarn dev
```

---

## Mobile setup (`apps/mobile`)

```bash
cd apps/mobile
yarn install
npx expo start
```

---

## Auth endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Register first admin |
| POST | `/api/v1/auth/login` | Public | Login → access token + HttpOnly refresh cookie |
| POST | `/api/v1/auth/refresh` | Public (cookie or header) | Rotate refresh token |
| POST | `/api/v1/auth/logout` | JWT | Revoke session |
| GET | `/api/v1/auth/me` | JWT | Current user |
| POST | `/api/v1/auth/change-password` | JWT | Change password, revokes all sessions |
| POST | `/api/v1/auth/forgot-password` | Public | Request reset link |
| POST | `/api/v1/auth/reset-password` | Public | Reset with token |
| GET | `/api/v1/auth/sessions` | JWT | List active sessions |
| POST | `/api/v1/auth/sessions/:id/revoke` | JWT | Revoke session |

## User endpoints

| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/v1/users` | SUPER_ADMIN, ADMIN, SUPERVISOR |
| GET | `/api/v1/users/:id` | SUPER_ADMIN, ADMIN, SUPERVISOR |
| POST | `/api/v1/users` | SUPER_ADMIN, ADMIN |
| PATCH | `/api/v1/users/:id` | SUPER_ADMIN, ADMIN |
| PATCH | `/api/v1/users/:id/status` | SUPER_ADMIN, ADMIN |
| DELETE | `/api/v1/users/:id` | SUPER_ADMIN, ADMIN |

## Collector endpoints

| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/v1/collectors` | SUPER_ADMIN, ADMIN, SUPERVISOR |
| GET | `/api/v1/collectors/:id` | SUPER_ADMIN, ADMIN, SUPERVISOR |
| POST | `/api/v1/collectors` | SUPER_ADMIN, ADMIN |
| PATCH | `/api/v1/collectors/:id` | SUPER_ADMIN, ADMIN |
| GET | `/api/v1/collectors/:id/payments` | SUPER_ADMIN, ADMIN, SUPERVISOR |
| GET | `/api/v1/collectors/:id/customers` | SUPER_ADMIN, ADMIN, SUPERVISOR |

---

## Roles

| Role | Level | Description |
|------|-------|-------------|
| SUPER_ADMIN | 100 | Full control |
| ADMIN | 80 | Manages clients, payments, plans, users |
| SUPERVISOR | 60 | Read-only + cobranza review |
| COLLECTOR | 40 | Assigned clients + payments + offline |
| TECHNICIAN | 40 | Work orders + technical data |
| VIEWER | 10 | Read-only |

---

## Security checklist

- [x] Argon2id password hashing (memoryCost 65536, timeCost 3, parallelism 4)
- [x] Refresh tokens hashed with Argon2id before storage
- [x] Access token in memory only (web), SecureStore (mobile)
- [x] Refresh token in HttpOnly cookie (web), SecureStore (mobile)
- [x] Refresh token rotation on every refresh
- [x] All sessions revoked on password change/reset
- [x] Session revocation (per-session and bulk)
- [x] Login lockout after N failed attempts (configurable)
- [x] Temporary lockout duration (configurable)
- [x] INACTIVE/BLOCKED users cannot access protected routes (ActiveUserGuard)
- [x] RBAC via RolesGuard + @Roles() decorator
- [x] Permission-level guard (PermissionsGuard) for fine-grained access
- [x] @Public() decorator for unauthenticated endpoints
- [x] Throttle on /auth/login (10 req/min)
- [x] Throttle on /auth/forgot-password (5 req/min)
- [x] Global rate limit (60 req/min)
- [x] Helmet security headers
- [x] Restrictive CORS (configurable via ALLOWED_ORIGINS)
- [x] Global ValidationPipe (whitelist, forbidNonWhitelisted, transform)
- [x] ClassSerializerInterceptor (honors @Exclude)
- [x] Audit log on: register, login, logout, password change, session revoke
- [x] Login attempt log (success + failure + reason + IP)
- [x] Role hierarchy enforcement (cannot create/manage users with equal or higher role)
- [x] User cannot change own status or delete themselves
- [x] Offline sync: authenticated user required, user status validated on sync
- [x] Offline sync: idempotent via clientRequestId (unique per tenant)
- [x] Password strength: uppercase + number + special character required
- [x] Email enumeration prevention in forgot-password
- [x] No secrets in .env files committed (all .env.example only)
- [x] .gitignore excludes .env files

---

## Notes for production

1. Set `NODE_ENV=production` to disable dev-only features (Swagger, devToken in forgot-password).
2. Use HTTPS. Refresh token cookie has `secure: true` in production.
3. ALLOWED_ORIGINS must list exact frontend domain.
4. Integrate email provider for forgot-password (SendGrid, Resend, etc.).
5. Consider rotating JWT_ACCESS_SECRET and JWT_REFRESH_SECRET periodically.
6. Set up Redis-backed throttler for distributed rate limiting.
7. Add CSRF token for web if using cookie-based auth from a browser.
