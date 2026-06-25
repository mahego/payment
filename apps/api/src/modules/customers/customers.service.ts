import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerStatus, Prisma } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { BulkActionDto, BulkActionType } from './dto/bulk-action.dto';
import { NetworkActionsService } from '../network-actions/network-actions.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly networkActionsService: NetworkActionsService,
  ) {}

  async findAll(filters?: {
    query?: string;
    status?: CustomerStatus;
    zoneId?: string;
    planId?: string;
  }) {
    const where: Prisma.CustomerWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.zoneId) {
      where.zoneId = filters.zoneId;
    }

    if (filters?.planId) {
      where.planId = filters.planId;
    }

    if (filters?.query) {
      const q = filters.query.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { pppoeUsername: { contains: q, mode: 'insensitive' } },
      ];
    }

    const customers = await this.prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        zone: true,
        plan: true,
      },
    });

    return customers.map((c) => ({
      ...c,
      currentBalance: Number(c.currentBalance),
    }));
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        mikrotikProfile: true,
        zone: true,
        plan: true,
        payments: {
          orderBy: { paidAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return {
      ...customer,
      currentBalance: Number(customer.currentBalance),
      payments: customer.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };
  }

  async create(dto: CreateCustomerDto) {
    // Check if PPPoE username is already used
    if (dto.pppoeUsername) {
      const existing = await this.prisma.customer.findFirst({
        where: { pppoeUsername: dto.pppoeUsername },
      });
      if (existing) {
        throw new ConflictException(`PPPoE username '${dto.pppoeUsername}' is already in use`);
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        ...dto,
        signupDate: new Date(dto.signupDate),
      },
    });

    return {
      ...customer,
      currentBalance: Number(customer.currentBalance),
    };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    // Check if customer exists
    await this.findOne(id);

    // Check if PPPoE username is unique
    if (dto.pppoeUsername) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          pppoeUsername: dto.pppoeUsername,
          NOT: { id },
        },
      });
      if (existing) {
        throw new ConflictException(`PPPoE username '${dto.pppoeUsername}' is already in use`);
      }
    }

    const data: Prisma.CustomerUpdateInput = {
      ...dto,
      signupDate: dto.signupDate ? new Date(dto.signupDate) : undefined,
    };

    const updated = await this.prisma.customer.update({
      where: { id },
      data,
    });

    return {
      ...updated,
      currentBalance: Number(updated.currentBalance),
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    
    try {
      await this.prisma.customer.delete({
        where: { id },
      });
      return { message: 'Customer successfully deleted' };
    } catch (error) {
      throw new ConflictException(
        'Cannot delete customer because they have registered payments or historical logs.'
      );
    }
  }

  async bulkAction(dto: BulkActionDto) {
    const { customerIds, action, payload } = dto;

    if (action === BulkActionType.SUSPEND) {
      const customers = await this.prisma.customer.findMany({
        where: { id: { in: customerIds }, mikrotikProfileId: { not: null } },
      });

      const actions = [];
      for (const customer of customers) {
        const queued = await this.networkActionsService.queueAction(
          'SUSPEND_CUSTOMER',
          customer.mikrotikProfileId!,
          customer.id
        );
        actions.push(queued);
      }
      return { success: true, queuedCount: actions.length, actions };
    }

    if (action === BulkActionType.REACTIVATE) {
      const customers = await this.prisma.customer.findMany({
        where: { id: { in: customerIds }, mikrotikProfileId: { not: null } },
      });

      const actions = [];
      for (const customer of customers) {
        const queued = await this.networkActionsService.queueAction(
          'REACTIVATE_CUSTOMER',
          customer.mikrotikProfileId!,
          customer.id
        );
        actions.push(queued);
      }
      return { success: true, queuedCount: actions.length, actions };
    }

    if (action === BulkActionType.CHANGE_STATUS) {
      if (!payload?.status) {
        throw new BadRequestException('Status payload is required for CHANGE_STATUS action');
      }
      const result = await this.prisma.customer.updateMany({
        where: { id: { in: customerIds } },
        data: { status: payload.status },
      });
      return { success: true, updatedCount: result.count };
    }

    if (action === BulkActionType.ASSIGN_ZONE) {
      const zoneId = payload?.zoneId === undefined ? undefined : payload.zoneId;
      if (zoneId) {
        const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
        if (!zone) {
          throw new NotFoundException(`Zone with ID "${zoneId}" not found`);
        }
      }
      const result = await this.prisma.customer.updateMany({
        where: { id: { in: customerIds } },
        data: { zoneId: zoneId },
      });
      return { success: true, updatedCount: result.count };
    }

    if (action === BulkActionType.ASSIGN_PLAN) {
      const planId = payload?.planId === undefined ? undefined : payload.planId;
      if (planId) {
        const plan = await this.prisma.servicePlan.findUnique({ where: { id: planId } });
        if (!plan) {
          throw new NotFoundException(`Service plan with ID "${planId}" not found`);
        }
      }
      const result = await this.prisma.customer.updateMany({
        where: { id: { in: customerIds } },
        data: { planId: planId },
      });
      return { success: true, updatedCount: result.count };
    }

    throw new BadRequestException(`Unknown bulk action "${action}"`);
  }
}

