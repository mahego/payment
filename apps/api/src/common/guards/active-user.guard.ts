import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return true; // let JwtAuthGuard handle unauthenticated

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Account is inactive');
    }
    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Account has been blocked');
    }
    return true;
  }
}
