import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomerStatus, Prisma } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { query?: string; status?: CustomerStatus }) {
    const where: Prisma.CustomerWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
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

    const user = await this.prisma.customer.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        addressLine: dto.addressLine,
        locality: dto.locality ?? null,
        municipality: dto.municipality ?? null,
        status: dto.status ?? CustomerStatus.ACTIVO,
        pppoeUsername: dto.pppoeUsername ?? null,
        currentBalance: dto.currentBalance ?? 0,
        signupDate: new Date(dto.signupDate),
        billingCutoffDay: dto.billingCutoffDay,
      },
    });

    return {
      ...user,
      currentBalance: Number(user.currentBalance),
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
    const customer = await this.findOne(id);
    
    // We restrict deleting customers with active payments due to foreign keys,
    // but Prisma RESTRICT will naturally throw an error. We can catch it or delete.
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
}
