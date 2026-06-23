import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from '../../common/strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Helpers ──────────────────────────────────────

  private async hashToken(token: string): Promise<string> {
    return argon2.hash(token);
  }

  private async verifyToken(plain: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  private generateAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    });
  }

  private async generateRefreshToken(
    user: User,
    ipAddress?: string,
    userAgent?: string,
    deviceName?: string,
  ) {
    const rawToken = uuidv4() + randomBytes(32).toString('hex');
    const hash = await this.hashToken(rawToken);

    const expiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // default 7 days

    if (expiresIn.endsWith('d')) {
      expiresAt.setDate(
        new Date().getDate() + parseInt(expiresIn.replace('d', '')),
      );
    }

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hash,
        deviceName: deviceName ?? null,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
        expiresAt,
      },
    });

    return { rawToken, session };
  }

  private async recordAttempt(
    email: string,
    success: boolean,
    userId: string | null,
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
  ) {
    await this.prisma.loginAttempt.create({
      data: { email, success, userId, ipAddress, userAgent, reason },
    });
  }

  private async auditLog(
    action: string,
    userId: string | null,
    meta?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        action,
        userId,
        entityType: 'auth',
        metadata: meta ?? null,
        ipAddress,
        userAgent,
      },
    });
  }

  // ── Validate for LocalStrategy ────────────────────

  async validateLocalUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const valid = await argon2.verify(user.passwordHash, password);
    return valid ? user : null;
  }

  // ── Register ─────────────────────────────────────

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        passwordHash,
      },
    });

    await this.auditLog('user.registered', user.id, { email: dto.email }, ipAddress, userAgent);
    this.logger.log(`User registered: ${user.email}`);

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  // ── Login ────────────────────────────────────────

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const maxAttempts =
      parseInt(this.config.get('MAX_FAILED_ATTEMPTS') ?? '5');
    const lockoutMinutes =
      parseInt(this.config.get('LOCKOUT_MINUTES') ?? '15');

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      await this.recordAttempt(dto.email, false, null, ipAddress, userAgent, 'user_not_found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordAttempt(dto.email, false, user.id, ipAddress, userAgent, 'account_locked');
      throw new ForbiddenException(
        `Account locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    if (user.status === UserStatus.BLOCKED) {
      await this.recordAttempt(dto.email, false, user.id, ipAddress, userAgent, 'account_blocked');
      throw new ForbiddenException('Account has been blocked');
    }

    if (user.status === UserStatus.INACTIVE) {
      await this.recordAttempt(dto.email, false, user.id, ipAddress, userAgent, 'account_inactive');
      throw new ForbiddenException('Account is inactive');
    }

    const passwordMatch = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordMatch) {
      const fails = user.failedAttempts + 1;
      const lockout =
        fails >= maxAttempts
          ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
          : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: fails,
          lockedUntil: lockout,
        },
      });

      await this.recordAttempt(dto.email, false, user.id, ipAddress, userAgent, 'wrong_password');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const accessToken = this.generateAccessToken(user);
    const { rawToken: refreshToken, session } = await this.generateRefreshToken(
      user,
      ipAddress,
      userAgent,
      dto.deviceName,
    );

    await this.recordAttempt(dto.email, true, user.id, ipAddress, userAgent);
    await this.auditLog('user.login', user.id, { sessionId: session.id }, ipAddress, userAgent);

    return { accessToken, refreshToken, sessionId: session.id };
  }

  // ── Refresh token ────────────────────────────────

  async refresh(rawRefreshToken: string, ipAddress?: string, userAgent?: string) {
    // Find matching sessions
    const sessions = await this.prisma.session.findMany({
      where: { revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    let matchedSession = null;
    for (const s of sessions) {
      const match = await this.verifyToken(rawRefreshToken, s.refreshTokenHash);
      if (match) {
        matchedSession = s;
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }

    const { user } = matchedSession;

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Account is inactive or blocked');
    }

    // Rotate: revoke old session and create new
    await this.prisma.session.update({
      where: { id: matchedSession.id },
      data: { revokedAt: new Date() },
    });

    const accessToken = this.generateAccessToken(user);
    const { rawToken: newRefreshToken, session: newSession } =
      await this.generateRefreshToken(
        user,
        ipAddress,
        userAgent ?? matchedSession.deviceName ?? undefined,
        matchedSession.deviceName ?? undefined,
      );

    await this.auditLog(
      'session.rotated',
      user.id,
      { oldSession: matchedSession.id, newSession: newSession.id },
      ipAddress,
      userAgent,
    );

    return { accessToken, refreshToken: newRefreshToken, sessionId: newSession.id };
  }

  // ── Logout ───────────────────────────────────────

  async logout(userId: string, sessionId: string, ipAddress?: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });
    if (!session) return;

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await this.auditLog('user.logout', userId, { sessionId }, ipAddress);
  }

  // ── Me ───────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        collectorProfile: true,
        technicianProfile: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Change password ──────────────────────────────

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ipAddress?: string,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all other sessions
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditLog('user.password_changed', userId, {}, ipAddress);
  }

  // ── Forgot password ──────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user || user.status !== UserStatus.ACTIVE) {
      return { message: 'If that email exists, a reset link was sent.' };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = await this.hashToken(rawToken);
    const ttl = parseInt(
      this.config.get('PASSWORD_RESET_TTL_MINUTES') ?? '30',
    );
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    // Invalidate previous tokens
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.auditLog('user.password_reset_requested', user.id, {}, ipAddress);

    // In production, send email here. For now, return token in dev only.
    const isDev = this.config.get('NODE_ENV') !== 'production';
    this.logger.log(`Password reset token generated for ${user.email}`);

    return {
      message: 'If that email exists, a reset link was sent.',
      ...(isDev ? { devToken: rawToken } : {}),
    };
  }

  // ── Reset password ───────────────────────────────

  async resetPassword(dto: ResetPasswordDto, ipAddress?: string) {
    const resets = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    let matched = null;
    for (const r of resets) {
      const ok = await this.verifyToken(dto.token, r.tokenHash);
      if (ok) { matched = r; break; }
    }

    if (!matched) throw new BadRequestException('Invalid or expired reset token');

    const newHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.user.update({
      where: { id: matched.userId },
      data: { passwordHash: newHash, failedAttempts: 0, lockedUntil: null },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: matched.id },
      data: { usedAt: new Date() },
    });

    // Revoke all sessions
    await this.prisma.session.updateMany({
      where: { userId: matched.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditLog('user.password_reset', matched.userId, {}, ipAddress);
    return { message: 'Password reset successfully' };
  }

  // ── Sessions ─────────────────────────────────────

  async getActiveSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string, ipAddress?: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await this.auditLog('session.revoked', userId, { sessionId }, ipAddress);
    return { message: 'Session revoked' };
  }
}
