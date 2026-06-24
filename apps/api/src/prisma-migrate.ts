#!/usr/bin/env node
// Release command script - runs Prisma migrations during Fly.io deployments
const { execSync } = require('child_process');
try {
  console.log('[Release] Running Prisma migrations...');
  execSync('npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('[Release] Migrations completed successfully.');
} catch (err) {
  console.error('[Release] Migration failed:', err.message);
  process.exit(1);
}
