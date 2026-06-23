import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Minimal RBAC permission map – extend as needed
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'customers:read', 'customers:write', 'customers:delete',
    'payments:read', 'payments:write',
    'plans:read', 'plans:write',
    'users:read', 'users:write', 'users:delete',
    'collectors:read', 'collectors:write',
    'reports:read',
    'suspensions:write',
    'sync:read', 'sync:write',
  ],
  SUPERVISOR: [
    'customers:read',
    'payments:read',
    'collectors:read',
    'reports:read',
    'suspensions:read',
  ],
  COLLECTOR: [
    'customers:read',
    'payments:read', 'payments:write',
    'sync:read', 'sync:write',
  ],
  TECHNICIAN: [
    'customers:read',
    'work-orders:read', 'work-orders:write',
  ],
  VIEWER: [
    'customers:read',
    'payments:read',
    'reports:read',
  ],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const granted = ROLE_PERMISSIONS[user.role] ?? [];
    if (granted.includes('*')) return true;

    const hasAll = required.every((p) => granted.includes(p));
    if (!hasAll) {
      throw new ForbiddenException(
        `Missing permission(s): ${required.join(', ')}`,
      );
    }
    return true;
  }
}
