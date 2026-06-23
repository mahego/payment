import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { User, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Allowed role hierarchy ────────────────────────
  private canManageRole(actorRole: Role, targetRole: Role): boolean {
    const hierarchy: Record<Role, number> = {
      SUPER_ADMIN: 100,
      ADMIN: 80,
      SUPERVISOR: 60,
      COLLECTOR: 40,
      TECHNICIAN: 40,
      VIEWER: 10,
    };
    return hierarchy[actorRole] > hierarchy[targetRole];
  }

  // ── List ─────────────────────────────────────────
  async findAll(filters?: { role?: Role; status?: UserStatus }) {
    return this.prisma.user.findMany({
      where: {
        ...(filters?.role ? { role: filters.role } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Get one ──────────────────────────────────────
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        lastLoginAt: true,
        failedAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        collectorProfile: true,
        technicianProfile: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Create ───────────────────────────────────────
  async create(dto: CreateUserDto, actor: User) {
    const targetRole = dto.role ?? Role.VIEWER;

    if (!this.canManageRole(actor.role, targetRole)) {
      throw new ForbiddenException(
        'You cannot create a user with a role equal or higher than yours',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

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
        role: targetRole,
      },
    });

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  // ── Update ───────────────────────────────────────
  async update(id: string, dto: UpdateUserDto, actor: User) {
    const target = await this.findOne(id);

    if (!this.canManageRole(actor.role, target.role as Role)) {
      throw new ForbiddenException('Insufficient permissions to update this user');
    }

    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email) {
      const conflict = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Email already in use');
      data.email = dto.email;
    }
    if (dto.role) {
      if (!this.canManageRole(actor.role, dto.role)) {
        throw new ForbiddenException('Cannot assign a role equal or higher than yours');
      }
      data.role = dto.role;
    }
    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
    }

    return this.prisma.user.update({ where: { id }, data });
  }

  // ── Update status ────────────────────────────────
  async updateStatus(id: string, dto: UpdateUserStatusDto, actor: User) {
    const target = await this.findOne(id);

    if (target.id === actor.id) {
      throw new ForbiddenException('Cannot change your own status');
    }

    if (!this.canManageRole(actor.role, target.role as Role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
    });

    // If blocking/deactivating, revoke all sessions
    if (dto.status !== 'ACTIVE') {
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { id: updated.id, status: updated.status };
  }

  // ── Delete ───────────────────────────────────────
  async remove(id: string, actor: User) {
    const target = await this.findOne(id);

    if (target.id === actor.id) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    if (!this.canManageRole(actor.role, target.role as Role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }
}
