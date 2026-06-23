import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class CollectorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  // ── List ─────────────────────────────────────────
  async findAll() {
    return this.prisma.collectorProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Get one ──────────────────────────────────────
  async findOne(id: string) {
    const profile = await this.prisma.collectorProfile.findFirst({
      where: { userId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Collector not found');
    return profile;
  }

  // ── Create (creates user + collector profile) ─────
  async create(
    userDto: CreateUserDto,
    profileDto: CreateCollectorDto,
    actor: User,
  ) {
    if (![Role.SUPER_ADMIN, Role.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Only admins can create collectors');
    }

    // Force role to COLLECTOR
    const user = await this.usersService.create(
      { ...userDto, role: Role.COLLECTOR },
      actor,
    );

    const profile = await this.prisma.collectorProfile.create({
      data: {
        userId: user.id,
        assignedZone: profileDto.assignedZone ?? null,
        cashLimit: profileDto.cashLimit ?? null,
        canRegisterOfflinePayments:
          profileDto.canRegisterOfflinePayments ?? true,
      },
    });

    return { user, profile };
  }

  // ── Update profile ────────────────────────────────
  async update(id: string, dto: CreateCollectorDto, actor: User) {
    if (![Role.SUPER_ADMIN, Role.ADMIN].includes(actor.role)) {
      throw new ForbiddenException('Only admins can update collectors');
    }

    const profile = await this.prisma.collectorProfile.findFirst({
      where: { userId: id },
    });
    if (!profile) throw new NotFoundException('Collector profile not found');

    return this.prisma.collectorProfile.update({
      where: { id: profile.id },
      data: {
        assignedZone: dto.assignedZone ?? profile.assignedZone,
        cashLimit: dto.cashLimit ?? profile.cashLimit,
        canRegisterOfflinePayments:
          dto.canRegisterOfflinePayments ?? profile.canRegisterOfflinePayments,
      },
    });
  }

  // ── Get payments ──────────────────────────────────
  async getPayments(collectorId: string) {
    return this.prisma.payment.findMany({
      where: { createdById: collectorId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 100,
    });
  }

  // ── Get assigned customers ────────────────────────
  // In production this should use a proper assignment table.
  // For now we return customers that have payments from this collector.
  async getCustomers(collectorId: string) {
    const customerIds = await this.prisma.payment
      .findMany({
        where: { createdById: collectorId },
        select: { customerId: true },
        distinct: ['customerId'],
      })
      .then((rows) => rows.map((r) => r.customerId));

    return this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
    });
  }
}
