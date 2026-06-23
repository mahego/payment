import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

const REFRESH_COOKIE = 'deluxnet_refresh';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/register ──────────────────────────
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register the initial admin user' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ) {
    return this.authService.register(dto, req.ip, req.headers['user-agent']);
  }

  // ── POST /auth/login ─────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked/blocked/inactive' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto,
      req.ip,
      req.headers['user-agent'],
    );

    // Set refresh token in HttpOnly cookie
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    return {
      accessToken: result.accessToken,
      sessionId: result.sessionId,
    };
  }

  // ── POST /auth/refresh ───────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken: string | undefined =
      req.cookies?.[REFRESH_COOKIE] ??
      (req.headers['x-refresh-token'] as string | undefined);

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const result = await this.authService.refresh(
      rawToken,
      req.ip,
      req.headers['user-agent'],
    );

    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

    return { accessToken: result.accessToken, sessionId: result.sessionId };
  }

  // ── POST /auth/logout ────────────────────────────
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke current session' })
  async logout(
    @CurrentUser() user: User,
    @Body() body: { sessionId?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId: string =
      body.sessionId ??
      (req.headers['x-session-id'] as string) ??
      '';

    await this.authService.logout(user.id, sessionId, req.ip);
    res.clearCookie(REFRESH_COOKIE, { path: COOKIE_OPTIONS.path });
    return { message: 'Logged out successfully' };
  }

  // ── GET /auth/me ─────────────────────────────────
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }

  // ── POST /auth/change-password ───────────────────
  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    await this.authService.changePassword(user.id, dto, req.ip);
    return { message: 'Password changed. All sessions revoked.' };
  }

  // ── POST /auth/forgot-password ───────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Request password reset link' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.forgotPassword(dto, req.ip);
  }

  // ── POST /auth/reset-password ────────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    return this.authService.resetPassword(dto, req.ip);
  }

  // ── GET /auth/sessions ───────────────────────────
  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions for current user' })
  async getSessions(@CurrentUser() user: User) {
    return this.authService.getActiveSessions(user.id);
  }

  // ── POST /auth/sessions/:id/revoke ───────────────
  @ApiBearerAuth()
  @Post('sessions/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @CurrentUser() user: User,
    @Param('id') sessionId: string,
    @Req() req: Request,
  ) {
    return this.authService.revokeSession(user.id, sessionId, req.ip);
  }
}
