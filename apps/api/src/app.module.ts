import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CollectorsModule } from './modules/collectors/collectors.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ActiveUserGuard } from './common/guards/active-user.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000,
        limit: 60,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CollectorsModule,
  ],
  providers: [
    // Rate-limit guard applied globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // JWT auth applied globally – @Public() decorator bypasses it
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Roles guard reads @Roles() decorator
    { provide: APP_GUARD, useClass: RolesGuard },
    // Active-user guard blocks INACTIVE/BLOCKED users
    { provide: APP_GUARD, useClass: ActiveUserGuard },
  ],
})
export class AppModule {}
