import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServicePlanDto } from './dto/create-service-plan.dto';
import { UpdateServicePlanDto } from './dto/update-service-plan.dto';

@Injectable()
export class ServicePlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServicePlanDto) {
    const existing = await this.prisma.servicePlan.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Service plan with name "${dto.name}" already exists`);
    }

    if (dto.zoneId) {
      const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
      if (!zone) {
        throw new NotFoundException(`Zone with ID "${dto.zoneId}" not found`);
      }
    }

    return this.prisma.servicePlan.create({
      data: dto,
    });
  }

  async findAll(activeOnly = true, zoneId?: string) {
    const where: any = {};
    if (activeOnly) {
      where.active = true;
    }
    if (zoneId) {
      where.zoneId = zoneId;
    }

    return this.prisma.servicePlan.findMany({
      where,
      orderBy: { price: 'asc' },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            customers: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.servicePlan.findUnique({
      where: { id },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            customers: true,
          },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException(`Service plan with ID "${id}" not found`);
    }
    return plan;
  }

  async update(id: string, dto: UpdateServicePlanDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.servicePlan.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Service plan with name "${dto.name}" already exists`);
      }
    }

    if (dto.zoneId) {
      const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
      if (!zone) {
        throw new NotFoundException(`Zone with ID "${dto.zoneId}" not found`);
      }
    }

    return this.prisma.servicePlan.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.servicePlan.update({
      where: { id },
      data: { active: false },
    });
  }
}
