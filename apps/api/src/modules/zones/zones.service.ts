import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateZoneDto) {
    const existing = await this.prisma.zone.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Zone with name "${dto.name}" already exists`);
    }

    return this.prisma.zone.create({
      data: dto,
    });
  }

  async findAll(activeOnly = true) {
    return this.prisma.zone.findMany({
      where: activeOnly ? { active: true } : {},
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            customers: true,
            plans: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            plans: true,
          },
        },
      },
    });
    if (!zone) {
      throw new NotFoundException(`Zone with ID "${id}" not found`);
    }
    return zone;
  }

  async update(id: string, dto: UpdateZoneDto) {
    // Check exists
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.zone.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Zone with name "${dto.name}" already exists`);
      }
    }

    return this.prisma.zone.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.zone.update({
      where: { id },
      data: { active: false },
    });
  }

  async getCustomers(id: string) {
    await this.findOne(id);
    return this.prisma.customer.findMany({
      where: { zoneId: id },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }
}
